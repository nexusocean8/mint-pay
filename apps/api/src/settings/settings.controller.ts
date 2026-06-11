import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminKeyGuard } from '../auth/admin-key.guard';
import { SettingsService } from './settings.service';
import { SettingsResponseDto, UpdateSettingsDto } from './dto/settings.dto';

@ApiTags('admin')
@ApiSecurity('admin-key')
@ApiUnauthorizedResponse({
  description: 'Missing or invalid X-Admin-Api-Key header',
})
@Controller('admin/settings')
@UseGuards(AdminKeyGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get live tunable settings' })
  @ApiOkResponse({ type: SettingsResponseDto })
  get(): SettingsResponseDto {
    return this.settings.getAll();
  }

  @Put()
  @ApiOperation({ summary: 'Update live tunable settings (partial)' })
  @ApiOkResponse({ type: SettingsResponseDto })
  async update(@Body() dto: UpdateSettingsDto): Promise<SettingsResponseDto> {
    return this.settings.update(dto);
  }
}
