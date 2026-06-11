import {
  Module,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { MoneroWalletProvider } from './monero.provider';
import { MoneroService } from './monero.service';
import { MoneroScannerService } from './monero-scanner.service';
import { ScannerLockModule } from '../scanner/scanner-lock.module';
import { Invoice, InvoiceSchema } from '../invoices/schemas/invoice.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { SettingsModule } from '../settings/settings.module';
import type { EnvironmentVariables } from '../config/env.validation';

const INTERVAL_NAME = 'xmr-payment-scanner-tick';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    ScannerLockModule,
    WebhooksModule,
    SettingsModule,
  ],
  providers: [MoneroWalletProvider, MoneroService, MoneroScannerService],
  exports: [MoneroService],
})
export class MoneroModule implements OnApplicationBootstrap, OnModuleDestroy {
  constructor(
    private readonly registry: SchedulerRegistry,
    private readonly scanner: MoneroScannerService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  onApplicationBootstrap(): void {
    const ms = this.config.get('SCANNER_INTERVAL_MS', { infer: true });
    const handle = setInterval(() => {
      void this.scanner.tick();
    }, ms);
    this.registry.addInterval(INTERVAL_NAME, handle);
  }

  onModuleDestroy(): void {
    if (this.registry.doesExist('interval', INTERVAL_NAME)) {
      this.registry.deleteInterval(INTERVAL_NAME);
    }
  }
}
