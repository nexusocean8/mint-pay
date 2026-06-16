import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MoneroService } from '../monero/monero.service';
import { FiroService } from '../firo/firo.service';
import { WalletInfoResponseDto } from './dto/wallet-info.dto';
import {
  InvoiceListQueryDto,
  InvoiceListResponseDto,
} from './dto/invoice-list.dto';
import {
  Invoice,
  InvoiceDocument,
  Chain,
} from '../invoices/schemas/invoice.schema';
import { StatsResponseDto } from './dto/wallet-stats.dto';

type LeanInvoice = Invoice & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AdminService {
  constructor(
    private readonly monero: MoneroService,
    private readonly firo: FiroService,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
  ) {}

  async getWalletInfo(chain: Chain): Promise<WalletInfoResponseDto> {
    if (chain === Chain.Firo) {
      return this.firo.getWalletInfo();
    }
    return this.monero.getWalletInfo();
  }

  async getStats(chain: Chain): Promise<StatsResponseDto> {
    const [volumeResult] = await this.invoiceModel.aggregate([
      { $match: { chain, status: 'confirmed' } },
      {
        $group: { _id: null, total: { $sum: { $toLong: '$receivedAtomic' } } },
      },
    ]);

    const confirmedVolumeAtomic = volumeResult
      ? String(volumeResult.total)
      : '0';

    if (chain === Chain.Firo) {
      const wallet = await this.firo.getWalletInfo();
      return { confirmedVolumeAtomic, balance: wallet.balance };
    }

    return { confirmedVolumeAtomic };
  }

  async listInvoices(
    query: InvoiceListQueryDto,
  ): Promise<InvoiceListResponseDto> {
    const { status, page = 1, limit = 20, chain = Chain.Xmr } = query;
    const filter: Record<string, unknown> = { chain };
    if (status) filter.status = status;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      this.invoiceModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<LeanInvoice[]>()
        .exec(),
      this.invoiceModel.countDocuments(filter),
    ]);

    const data = docs.map((doc) => ({
      id: doc._id.toString(),
      chain: doc.chain,
      asset: doc.asset,
      assetDecimals: doc.assetDecimals,
      address: doc.address,
      addressIndex: doc.addressIndex,
      amountAtomic: doc.amountAtomic,
      amountFiat: doc.amountFiat,
      fiatCurrency: doc.fiatCurrency,
      rate: doc.rate,
      rateLockedAt: doc.rateLockedAt.toISOString(),
      expiresAt: doc.expiresAt.toISOString(),
      status: doc.status,
      confirmationsRequired: doc.confirmationsRequired,
      confirmations: doc.confirmations,
      receivedAtomic: doc.receivedAtomic,
      ...(doc.firstSeenAt && { firstSeenAt: doc.firstSeenAt.toISOString() }),
      ...(doc.paidAt && { paidAt: doc.paidAt.toISOString() }),
      ...(doc.webhookUrl && { webhookUrl: doc.webhookUrl }),
      ...(doc.chainData && { chainData: doc.chainData }),
      ...(doc.metadata && { metadata: doc.metadata }),
      createdAt: doc.createdAt.toISOString(),
    }));

    return { data, total, page, limit };
  }
}
