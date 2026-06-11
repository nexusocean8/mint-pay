import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiSecurity,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminKeyGuard } from '../auth/admin-key.guard';
import { WalletInfoResponseDto } from './dto/wallet-info.dto';
import {
  InvoiceListQueryDto,
  InvoiceListResponseDto,
} from './dto/invoice-list.dto';

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
  @ApiOperation({
    summary: 'Get wallet info',
    description:
      'Returns view-only wallet material (primary address, private view key, restore height) and sync state.',
  })
  @ApiOkResponse({ type: WalletInfoResponseDto })
  getInfo(): Promise<WalletInfoResponseDto> {
    return this.admin.getWalletInfo();
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List invoices' })
  @ApiOkResponse({ type: InvoiceListResponseDto })
  listInvoices(
    @Query() query: InvoiceListQueryDto,
  ): Promise<InvoiceListResponseDto> {
    return this.admin.listInvoices(query);
  }
}
