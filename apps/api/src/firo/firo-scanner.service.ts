import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Invoice,
  InvoiceDocument,
  InvoiceStatus,
  Chain,
} from '../invoices/schemas/invoice.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { FiroService } from './firo.service';
import { ScannerLockService } from '../scanner/scanner-lock.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { WebhookEvent } from '../webhooks/schemas/webhook-delivery.schema';
import { SettingsService } from '../settings/settings.service';

const LOCK_NAME = 'firo-payment-scanner';
const CHAIN = Chain.Firo;
const NON_TERMINAL: InvoiceStatus[] = [
  InvoiceStatus.Pending,
  InvoiceStatus.Seen,
  InvoiceStatus.Underpaid,
];
const SAT_PER_FIRO = 100_000_000n;

function firoToSat(decimal: string | number): bigint {
  const s = typeof decimal === 'number' ? decimal.toFixed(8) : decimal;
  const [whole, frac = ''] = s.split('.');
  const fracPadded = (frac + '00000000').slice(0, 8);
  return BigInt(whole) * SAT_PER_FIRO + BigInt(fracPadded);
}

@Injectable()
export class FiroScannerService {
  private readonly log = new Logger(FiroScannerService.name);
  private running = false;

  constructor(
    @InjectModel(Invoice.name)
    private readonly invoices: Model<InvoiceDocument>,
    @InjectModel(Payment.name)
    private readonly payments: Model<PaymentDocument>,
    private readonly firo: FiroService,
    private readonly lock: ScannerLockService,
    private readonly webhooks: WebhooksService,
    private readonly settings: SettingsService,
  ) {}

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const ttl = this.settings.get('scannerLockTtlMs');
      const acquired = await this.lock.acquire(LOCK_NAME, ttl);
      if (!acquired) return;
      try {
        await this.runOnce();
      } finally {
        await this.lock.release(LOCK_NAME);
      }
    } catch (err) {
      this.log.error(
        `Firo scanner tick failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    } finally {
      this.running = false;
    }
  }

  private async runOnce(): Promise<void> {
    const tipHeight = await this.firo.getBlockCount();

    const active = await this.invoices.find({
      chain: CHAIN,
      status: { $in: NON_TERMINAL },
    });

    if (active.length === 0) {
      await this.expireStale();
      return;
    }

    for (const inv of active) {
      try {
        await this.processInvoice(inv, tipHeight);
      } catch (err) {
        this.log.warn(
          `Invoice ${inv._id.toString()} processing failed: ${(err as Error).message}`,
        );
      }
    }

    await this.expireStale();
  }

  private async processInvoice(
    inv: InvoiceDocument,
    tipHeight: number,
  ): Promise<void> {
    let txids: string[];
    try {
      txids = await this.firo.rpc.getAddressTxIds(inv.address);
    } catch (err) {
      this.log.warn(`getAddressTxIds failed for ${inv.address}:${err}`);
      return;
    }
    if (!txids || txids.length === 0) return;

    this.log.log(`Tick: ${txids.length} txid(s) for address=${inv.address}`);

    const known = await this.payments
      .find({ chain: CHAIN, invoiceId: inv._id }, { txHash: 1 })
      .lean();

    const knownKeys = new Set(known.map((p) => p.txHash));

    let changed = false;

    for (const txid of txids) {
      const tx = await this.firo.rpc.getRawTransaction(txid);
      const outs = tx.vout ?? [];

      for (const out of outs) {
        const addrs = out.scriptPubKey?.addresses ?? [];
        if (!addrs.includes(inv.address)) continue;

        const txHashKey = `${txid}:${out.n}`;

        if (!knownKeys.has(txHashKey)) {
          await this.payments
            .create({
              chain: CHAIN,
              invoiceId: inv._id,
              address: inv.address,
              addressIndex: inv.addressIndex,
              txHash: txHashKey,
              amountAtomic: firoToSat(out.value).toString(),
              confirmations: 0,
              unlocked: true,
              firstSeenAt: new Date(),
            })
            .catch((err: { code?: number }) => {
              if (err.code !== 11000) throw err;
            });
          changed = true;
        }
      }

      const blockHash = tx.blockhash;
      if (blockHash) {
        const block = await this.firo.getBlockWithChainlock(blockHash);
        const conf = tipHeight - block.height + 1;
        const res = await this.payments.updateMany(
          {
            chain: CHAIN,
            invoiceId: inv._id,
            txHash: { $regex: `^${txid}:` },
          },
          {
            $set: {
              confirmations: conf,
              blockHeight: block.height,
              ...(conf >= 1 ? { confirmedAt: new Date() } : {}),
            },
          },
        );

        if (res.modifiedCount > 0) changed = true;
      }
    }

    if (changed || NON_TERMINAL.includes(inv.status)) {
      await this.recomputeInvoice(inv._id);
    }
  }

  private async recomputeInvoice(invoiceId: Types.ObjectId): Promise<void> {
    const inv = await this.invoices.findOne({ _id: invoiceId, chain: CHAIN });

    if (!inv) return;
    if (!NON_TERMINAL.includes(inv.status)) return;

    const pays = await this.payments.find({ chain: CHAIN, invoiceId });
    if (pays.length === 0) return;

    const required = inv.confirmationsRequired;
    const totalReceived = pays.reduce(
      (acc, p) => acc + BigInt(p.amountAtomic),
      0n,
    );
    const owed = BigInt(inv.amountAtomic);
    const minConfirmations = pays.reduce(
      (acc, p) => Math.min(acc, p.confirmations),
      Number.POSITIVE_INFINITY,
    );
    const isConfirmed = minConfirmations >= required;

    const updates: Partial<Invoice> = {
      receivedAtomic: totalReceived.toString(),
      confirmations: minConfirmations === Infinity ? 0 : minConfirmations,
    };

    let nextStatus: InvoiceStatus = inv.status;
    let webhookEvent: WebhookEvent | null = null;

    if (inv.status === InvoiceStatus.Pending) {
      nextStatus = InvoiceStatus.Seen;
      updates.firstSeenAt = inv.firstSeenAt ?? new Date();
      webhookEvent = WebhookEvent.InvoiceSeen;
    }

    if (isConfirmed) {
      if (totalReceived >= owed) {
        nextStatus = InvoiceStatus.Confirmed;
        updates.paidAt = new Date();
        webhookEvent = WebhookEvent.InvoiceConfirmed;
      } else {
        nextStatus = InvoiceStatus.Underpaid;
        webhookEvent = WebhookEvent.InvoiceUnderpaid;
      }
    }

    const statusChanged = nextStatus !== inv.status;
    updates.status = nextStatus;

    await this.invoices.updateOne({ _id: inv._id }, { $set: updates });

    if (statusChanged && webhookEvent && inv.webhookUrl) {
      await this.webhooks.enqueue(inv._id, inv.webhookUrl, webhookEvent, {
        invoiceId: inv._id.toString(),
        chain: inv.chain,
        asset: inv.asset,
        assetDecimals: inv.assetDecimals,
        status: nextStatus,
        address: inv.address,
        amountAtomic: inv.amountAtomic,
        receivedAtomic: updates.receivedAtomic,
        confirmations: updates.confirmations,
      });
    }
  }

  private async expireStale(): Promise<void> {
    const now = new Date();
    const stale = await this.invoices.find({
      chain: CHAIN,
      status: InvoiceStatus.Pending,
      expiresAt: { $lte: now },
    });

    for (const inv of stale) {
      const res = await this.invoices.updateOne(
        { _id: inv._id, status: InvoiceStatus.Pending },
        { $set: { status: InvoiceStatus.Expired } },
      );

      if (res.modifiedCount > 0 && inv.webhookUrl) {
        await this.webhooks.enqueue(
          inv._id,
          inv.webhookUrl,
          WebhookEvent.InvoiceExpired,
          {
            invoiceId: inv._id.toString(),
            chain: inv.chain,
            asset: inv.asset,
            assetDecimals: inv.assetDecimals,
            status: InvoiceStatus.Expired,
            address: inv.address,
          },
        );
      }
    }
  }
}
