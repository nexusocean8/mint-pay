import {
  Controller,
  Get,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiSecurity,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiQuery,
  ApiProduces,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminKeyGuard } from '../auth/admin-key.guard';
import { WalletInfoResponseDto } from './dto/wallet-info.dto';
import {
  InvoiceListQueryDto,
  InvoiceListResponseDto,
} from './dto/invoice-list.dto';
import { StatsResponseDto } from './dto/wallet-stats.dto';
import { Chain } from '@mint-pay/types';

@ApiTags('admin')
@ApiSecurity('admin-key')
@ApiUnauthorizedResponse({
  description: 'Missing or invalid X-Admin-Api-Key header',
})
@Controller('admin')
@UseGuards(AdminKeyGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('wallet')
  @ApiOperation({ summary: 'Get wallet info' })
  @ApiQuery({ name: 'chain', enum: Chain, required: false })
  @ApiOkResponse({ type: WalletInfoResponseDto })
  getInfo(
    @Query('chain') chain: Chain = Chain.Xmr,
  ): Promise<WalletInfoResponseDto> {
    return this.admin.getWalletInfo(chain);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get stats' })
  @ApiOkResponse({ type: StatsResponseDto })
  async getStats(@Query('chain') chain: Chain): Promise<StatsResponseDto> {
    return this.admin.getStats(chain);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List invoices' })
  @ApiOkResponse({ type: InvoiceListResponseDto })
  listInvoices(
    @Query() query: InvoiceListQueryDto,
  ): Promise<InvoiceListResponseDto> {
    return this.admin.listInvoices(query);
  }

  @Get('firo/backup')
  @ApiOperation({ summary: 'Download a fresh wallet.dat backup' })
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({
    description: 'Wallet backup file stream',
    schema: { type: 'string', format: 'binary' },
  })
  async getWalletBackup(): Promise<StreamableFile> {
    return await this.admin.getWalletBackup();
  }
}
