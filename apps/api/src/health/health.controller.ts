import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MoneroService } from '../monero/monero.service';
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
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({ type: LiveResponseDto })
  live(): LiveResponseDto {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe',
    description: 'Checks Mongo, wallet loaded, and daemon reachability.',
  })
  @ApiOkResponse({ type: ReadyResponseDto })
  async ready(): Promise<ReadyResponseDto> {
    const checks: Record<string, HealthCheckDto> = {};

    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    checks.mongo = { ok: this.mongo.readyState === 1 };

    try {
      const height = await this.monero.getHeight();
      checks.wallet = { ok: true, detail: `height=${height}` };
    } catch (err) {
      checks.wallet = { ok: false, detail: (err as Error).message };
    }

    try {
      const conn = await this.monero.getClient().getDaemonConnection();
      const isOnline = conn?.getIsOnline?.() ?? true;
      checks.daemon = {
        ok: isOnline,
        detail: conn?.getUri?.() ?? 'unknown',
      };
    } catch (err) {
      checks.daemon = { ok: false, detail: (err as Error).message };
    }

    const ok = Object.values(checks).every((c) => c.ok);
    return { status: ok ? 'ok' : 'degraded', checks };
  }

  @Get('synced')
  @ApiOperation({
    summary: 'Sync probe',
    description:
      'Returns ok when wallet height is within the configured sync threshold of daemon tip.',
  })
  @ApiOkResponse({ type: SyncedResponseDto })
  async synced(): Promise<SyncedResponseDto> {
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
