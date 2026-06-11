import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { MoneroModule } from './monero/monero.module';
import { AuthModule } from './auth/auth.module';
import { PriceModule } from './price/price.module';
import { InvoicesModule } from './invoices/invoices.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ScannerModule } from './scanner/scanner.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { SettingsModule } from './settings/settings.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    MoneroModule,
    AuthModule,
    PriceModule,
    InvoicesModule,
    WebhooksModule,
    ScannerModule,
    AdminModule,
    HealthModule,
    SettingsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
