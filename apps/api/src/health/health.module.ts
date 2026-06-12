import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { MoneroModule } from '../monero/monero.module';
import { FiroModule } from '../firo/firo.module';

@Module({
  imports: [MoneroModule, FiroModule],
  controllers: [HealthController],
})
export class HealthModule {}
