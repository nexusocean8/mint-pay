import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { MoneroModule } from '../monero/monero.module';

@Module({
  imports: [MoneroModule],
  controllers: [HealthController],
})
export class HealthModule {}
