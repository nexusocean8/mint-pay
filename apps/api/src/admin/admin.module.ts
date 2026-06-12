import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { MoneroModule } from '../monero/monero.module';
import { AuthModule } from '../auth/auth.module';
import { Invoice, InvoiceSchema } from '../invoices/schemas/invoice.schema';
import { FiroModule } from '../firo/firo.module';

@Module({
  imports: [
    MoneroModule,
    FiroModule,
    AuthModule,
    MongooseModule.forFeature([{ name: Invoice.name, schema: InvoiceSchema }]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
