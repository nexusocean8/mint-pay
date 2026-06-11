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
import { SettingsService } from '../settings/settings.service';

const CHAIN = Chain.Xmr;
const ASSET = Asset.Xmr;
const ASSET_DECIMALS = 12;

@Injectable()
export class InvoicesService {
  private readonly log = new Logger(InvoicesService.name);

  constructor(
    @InjectModel(Invoice.name)
    private readonly invoices: Model<InvoiceDocument>,
    private readonly price: PriceService,
    private readonly monero: MoneroService,
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

    const fiatCurrency = (dto.fiatCurrency ?? 'USD').toUpperCase();

    // Record fiat equivalent at lock time (informational).
    let amountFiat = 0;
    let rate = 0;
    let rateLockedAt = new Date();
    try {
      const quote = await this.price.getQuote(fiatCurrency);
      const xmr = Number(BigInt(dto.amountAtomic)) / 10 ** ASSET_DECIMALS;
      amountFiat = xmr * quote.fiatPerXmr;
      rate = quote.xmrPerFiat;
      rateLockedAt = quote.fetchedAt;
    } catch (err) {
      this.log.warn(
        `Price lock skipped: ${(err as Error).message}. Invoice created without fiat record.`,
      );
    }

    const sub = await this.monero.createSubaddress(
      `invoice:${rateLockedAt.toISOString()}`,
    );
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const created = await this.invoices.create({
      chain: CHAIN,
      asset: ASSET,
      assetDecimals: ASSET_DECIMALS,
      address: sub.address,
      addressIndex: sub.index,
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
    const inv = await this.invoices.findOne({ _id: id, chain: CHAIN }).exec();
    if (!inv) throw new NotFoundException('Invoice not found');
    return this.toResponse(inv);
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
