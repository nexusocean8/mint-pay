import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import {
  Settings,
  SettingsDocument,
  SETTINGS_KEY,
} from './schemas/settings.schema';
import type { EnvironmentVariables } from '../config/env.validation';

export type SettingsFields = {
  confirmationDepth: number;
  invoiceDefaultExpirySec: number;
  invoiceMaxExpirySec: number;
  scannerLockTtlMs: number;
  syncedThresholdBlocks: number;
  rateCacheTtlMs: number;
  webhookMaxAttempts: number;
  webhookTimeoutMs: number;
};

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly log = new Logger(SettingsService.name);
  private cache!: SettingsFields;

  constructor(
    @InjectModel(Settings.name)
    private readonly model: Model<SettingsDocument>,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    const existing = await this.model
      .findOne({ key: SETTINGS_KEY })
      .lean()
      .exec();
    if (existing) {
      this.cache = this.project(existing);
      this.log.log('Settings loaded from Mongo');
      return;
    }
    const seed: SettingsFields = {
      confirmationDepth: this.config.get('CONFIRMATION_DEPTH', { infer: true }),
      invoiceDefaultExpirySec: this.config.get('INVOICE_DEFAULT_EXPIRY_SEC', {
        infer: true,
      }),
      invoiceMaxExpirySec: this.config.get('INVOICE_MAX_EXPIRY_SEC', {
        infer: true,
      }),
      scannerLockTtlMs: this.config.get('SCANNER_LOCK_TTL_MS', { infer: true }),
      syncedThresholdBlocks: this.config.get('MONERO_SYNCED_THRESHOLD_BLOCKS', {
        infer: true,
      }),
      rateCacheTtlMs: this.config.get('RATE_CACHE_TTL_MS', { infer: true }),
      webhookMaxAttempts: this.config.get('WEBHOOK_MAX_ATTEMPTS', {
        infer: true,
      }),
      webhookTimeoutMs: this.config.get('WEBHOOK_TIMEOUT_MS', { infer: true }),
    };
    await this.model.create({ key: SETTINGS_KEY, ...seed });
    this.cache = seed;
    this.log.log('Settings seeded from env');
  }

  private project(doc: SettingsFields): SettingsFields {
    return {
      confirmationDepth: doc.confirmationDepth,
      invoiceDefaultExpirySec: doc.invoiceDefaultExpirySec,
      invoiceMaxExpirySec: doc.invoiceMaxExpirySec,
      scannerLockTtlMs: doc.scannerLockTtlMs,
      syncedThresholdBlocks: doc.syncedThresholdBlocks,
      rateCacheTtlMs: doc.rateCacheTtlMs,
      webhookMaxAttempts: doc.webhookMaxAttempts,
      webhookTimeoutMs: doc.webhookTimeoutMs,
    };
  }

  get<K extends keyof SettingsFields>(key: K): SettingsFields[K] {
    return this.cache[key];
  }

  getAll(): SettingsFields {
    return { ...this.cache };
  }

  async update(partial: Partial<SettingsFields>): Promise<SettingsFields> {
    const set: Partial<SettingsFields> = {};
    for (const [k, v] of Object.entries(partial)) {
      if (v !== undefined) (set as Record<string, unknown>)[k] = v;
    }
    if (Object.keys(set).length === 0) return this.getAll();

    const updated = await this.model
      .findOneAndUpdate(
        { key: SETTINGS_KEY },
        { $set: set },
        { returnDocument: 'after', upsert: false, runValidators: true },
      )
      .lean()
      .exec();
    if (!updated) {
      throw new Error('Settings document missing; load() not run');
    }
    this.cache = this.project(updated);
    return this.getAll();
  }
}
