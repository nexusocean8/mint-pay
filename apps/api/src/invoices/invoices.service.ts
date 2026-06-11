import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import {
  Invoice,
  InvoiceDocument,
  Chain,
  Asset,
} from './schemas/invoice.schema';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { PriceService } from '../price/price.service';
import { MoneroService } from '../monero/monero.service';
import { FiroService } from '../firo/firo.service';
import { SettingsService } from '../settings/settings.service';
import BigNumber from 'bignumber.js';

const CHAIN_CONFIG = {
  [Chain.Xmr]: { asset: Asset.Xmr, decimals: 12, symbol: 'XMR' },
  [Chain.Firo]: { asset: Asset.Firo, decimals: 8, symbol: 'FIRO' },
} as const;

@Injectable()
export class InvoicesService {
  private readonly log = new Logger(InvoicesService.name);

  constructor(
    @InjectModel(Invoice.name)
    private readonly invoices: Model<InvoiceDocument>,
    private readonly price: PriceService,
    private readonly monero: MoneroService,
    private readonly firo: FiroService,
    private readonly settings: SettingsService,
  ) {}

  async create(dto: CreateInvoiceDto): Promise<InvoiceResponseDto> {
    const defaultExpiry = this.settings.get('invoiceDefaultExpirySec');
    const maxExpiry = this.settings.get('invoiceMaxExpirySec');
    const defaultConfirmations = this.settings.get('confirmationDepth');

    const expiresIn = dto.expiresInSeconds ?? defaultExpiry;
    if (expiresIn > maxExpiry) {
      throw new BadRequestException(
        `expiresInSeconds exceeds maximum (${maxExpiry})`,
      );
    }

    const chain = dto.chain;
    const { asset, decimals, symbol } = CHAIN_CONFIG[chain];
    const fiatCurrency = (dto.fiatCurrency ?? 'USD').toUpperCase();

    let amountFiat = 0;
    let rate = 0;
    let rateLockedAt = new Date();
    try {
      const quote = await this.price.getQuote(symbol, fiatCurrency);
      const units = new BigNumber(dto.amountAtomic).dividedBy(
        new BigNumber(10).pow(decimals),
      );
      amountFiat = units.multipliedBy(quote.fiatPerAsset).toNumber();
      rate = quote.assetPerFiat;
      rateLockedAt = quote.fetchedAt;
    } catch (err) {
      this.log.warn(
        `Price lock skipped: ${(err as Error).message}. Invoice created without fiat record.`,
      );
    }

    const { address, addressIndex } = await this.resolveAddress(
      chain,
      rateLockedAt,
    );
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const created = await this.invoices.create({
      chain,
      asset,
      assetDecimals: decimals,
      address,
      addressIndex,
      amountAtomic: dto.amountAtomic,
      amountFiat,
      fiatCurrency,
      rate,
      rateLockedAt,
      expiresAt,
      confirmationsRequired: dto.confirmationsRequired ?? defaultConfirmations,
      webhookUrl: dto.webhookUrl,
      metadata: dto.metadata,
    });

    return this.toResponse(created);
  }

  async findById(id: string): Promise<InvoiceResponseDto> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Invoice not found');
    }
    const inv = await this.invoices.findById(id).exec();
    if (!inv) throw new NotFoundException('Invoice not found');
    return this.toResponse(inv);
  }

  private async resolveAddress(
    chain: Chain,
    rateLockedAt: Date,
  ): Promise<{ address: string; addressIndex: number }> {
    if (chain === Chain.Xmr) {
      const sub = await this.monero.createSubaddress(
        `invoice:${rateLockedAt.toISOString()}`,
      );
      return { address: sub.address, addressIndex: sub.index };
    }
    // Firo hotwallet — addressIndex is not meaningful but kept for schema consistency
    const address = await this.firo.getNewAddress();
    return { address, addressIndex: 0 };
  }

  private toResponse(inv: InvoiceDocument): InvoiceResponseDto {
    return {
      id: inv._id.toString(),
      chain: inv.chain,
      asset: inv.asset,
      assetDecimals: inv.assetDecimals,
      address: inv.address,
      addressIndex: inv.addressIndex,
      amountAtomic: inv.amountAtomic,
      amountFiat: inv.amountFiat,
      fiatCurrency: inv.fiatCurrency,
      rate: inv.rate,
      rateLockedAt: inv.rateLockedAt.toISOString(),
      expiresAt: inv.expiresAt.toISOString(),
      status: inv.status,
      confirmationsRequired: inv.confirmationsRequired,
      confirmations: inv.confirmations,
      receivedAtomic: inv.receivedAtomic,
      firstSeenAt: inv.firstSeenAt?.toISOString(),
      paidAt: inv.paidAt?.toISOString(),
      webhookUrl: inv.webhookUrl,
      chainData: inv.chainData,
      metadata: inv.metadata,
      createdAt: (
        inv as unknown as { createdAt: Date }
      ).createdAt.toISOString(),
    };
  }
}
