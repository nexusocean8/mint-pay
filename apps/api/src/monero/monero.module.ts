import { Module } from '@nestjs/common';
import { MoneroWalletProvider } from './monero.provider';
import { MoneroService } from './monero.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  providers: [MoneroWalletProvider, MoneroService],
  exports: [MoneroService],
})
export class MoneroModule {}
