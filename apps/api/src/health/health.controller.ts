import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MoneroService } from '../monero/monero.service';
import { FiroService } from '../firo/firo.service';
import { Chain } from '../invoices/schemas/invoice.schema';
import {
  LiveResponseDto,
  ReadyResponseDto,
  SyncedResponseDto,
  HealthCheckDto,
} from './dto/health.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly mongo: Connection,
    private readonly monero: MoneroService,
    private readonly firo: FiroService,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({ type: LiveResponseDto })
  live(): LiveResponseDto {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiQuery({ name: 'chain', enum: Chain, required: false })
  @ApiOkResponse({ type: ReadyResponseDto })
  async ready(
    @Query('chain') chain: Chain = Chain.Xmr,
  ): Promise<ReadyResponseDto> {
    const checks: Record<string, HealthCheckDto> = {};

    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    checks.database = { ok: this.mongo.readyState === 1 };

    if (chain === Chain.Firo) {
      try {
        const height = await this.firo.getBlockCount();
        checks.node = { ok: true, detail: `height=${height}` };
      } catch (err) {
        checks.node = { ok: false, detail: (err as Error).message };
      }
    } else {
      try {
        const height = await this.monero.getHeight();
        checks.wallet = { ok: true, detail: `height=${height}` };
      } catch (err) {
        checks.wallet = { ok: false, detail: (err as Error).message };
      }
      try {
        const conn = await this.monero.getClient().getDaemonConnection();
        const isOnline = conn?.getIsOnline?.() ?? true;
        checks.node = { ok: isOnline, detail: conn?.getUri?.() ?? 'unknown' };
      } catch (err) {
        checks.node = { ok: false, detail: (err as Error).message };
      }
    }

    const ok = Object.values(checks).every((c) => c.ok);
    return { status: ok ? 'ok' : 'degraded', checks };
  }

  @Get('synced')
  @ApiOperation({ summary: 'Sync probe' })
  @ApiQuery({ name: 'chain', enum: Chain, required: false })
  @ApiOkResponse({ type: SyncedResponseDto })
  async synced(
    @Query('chain') chain: Chain = Chain.Xmr,
  ): Promise<SyncedResponseDto> {
    if (chain === Chain.Firo) {
      try {
        const blockHeight = await this.firo.getBlockCount();
        return {
          status: 'ok',
          walletHeight: blockHeight,
          daemonHeight: blockHeight,
          behind: 0,
        };
      } catch (err) {
        return {
          status: 'syncing',
          walletHeight: 0,
          daemonHeight: 0,
          behind: -1,
          detail: (err as Error).message,
        };
      }
    }

    try {
      const [walletHeight, daemonHeight, synced] = await Promise.all([
        this.monero.getHeight(),
        this.monero.getDaemonHeight(),
        this.monero.isSynced(),
      ]);
      return {
        status: synced ? 'ok' : 'syncing',
        walletHeight,
        daemonHeight,
        behind: daemonHeight - walletHeight,
      };
    } catch (err) {
      return {
        status: 'syncing',
        walletHeight: 0,
        daemonHeight: 0,
        behind: -1,
        detail: (err as Error).message,
      };
    }
  }
}
