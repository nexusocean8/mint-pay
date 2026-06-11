import {
  Module,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ScannerService } from './scanner.service';
import { ScannerLockService } from './scanner-lock.service';
import { ScannerLock, ScannerLockSchema } from './schemas/scanner-lock.schema';
import { Invoice, InvoiceSchema } from '../invoices/schemas/invoice.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { MoneroModule } from '../monero/monero.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import type { EnvironmentVariables } from '../config/env.validation';
import { SettingsModule } from '../settings/settings.module';

const INTERVAL_NAME = 'payment-scanner-tick';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: ScannerLock.name, schema: ScannerLockSchema },
    ]),
    MoneroModule,
    WebhooksModule,
    SettingsModule,
  ],
  providers: [ScannerService, ScannerLockService],
  exports: [ScannerService],
})
export class ScannerModule implements OnApplicationBootstrap, OnModuleDestroy {
  constructor(
    private readonly registry: SchedulerRegistry,
    private readonly scanner: ScannerService,
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
