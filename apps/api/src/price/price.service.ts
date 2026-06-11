import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { SettingsService } from '../settings/settings.service';
import { RATE_PROVIDER, type RateProvider } from './rate-provider.interface';
import type { PriceQuote } from './price.types';

const XMR_SYMBOL = 'XMR';
const PICONERO_PER_XMR = new BigNumber('1e12');

@Injectable()
export class PriceService {
  private readonly log = new Logger(PriceService.name);
  private cache = new Map<string, PriceQuote>();

  constructor(
    @Inject(RATE_PROVIDER) private readonly rates: RateProvider,
    private readonly settings: SettingsService,
  ) {}

  async getQuote(fiatCurrency: string): Promise<PriceQuote> {
    const key = fiatCurrency.toUpperCase();
    const ttl = this.settings.get('rateCacheTtlMs');
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.fetchedAt.getTime() < ttl) {
      return cached;
    }

    try {
      const fiatPerXmr = await this.rates.getRate(XMR_SYMBOL, key);
      const xmrPerFiat = new BigNumber(1).dividedBy(fiatPerXmr).toNumber();
      const fresh: PriceQuote = {
        fiatPerXmr,
        xmrPerFiat,
        fiatCurrency: key,
        fetchedAt: new Date(),
        source: this.rates.source,
      };
      this.cache.set(key, fresh);
      return fresh;
    } catch (err) {
      if (cached) {
        this.log.warn(
          `Rate fetch failed (${(err as Error).message}); serving stale quote for ${key}`,
        );
        return cached;
      }
      throw new ServiceUnavailableException('Price feed unavailable');
    }
  }

  /**
   * Convert a fiat amount to piconero using a locked quote.
   * Rounds up so the merchant never under-collects due to truncation.
   */
  convertFiatToPiconero(
    amountFiat: number | string,
    quote: PriceQuote,
  ): string {
    const amount = new BigNumber(amountFiat);
    if (amount.isNaN() || amount.isLessThanOrEqualTo(0)) {
      throw new Error('amountFiat must be > 0');
    }
    const xmrPerFiat = new BigNumber(quote.xmrPerFiat);
    const piconero = amount
      .multipliedBy(xmrPerFiat)
      .multipliedBy(PICONERO_PER_XMR)
      .integerValue(BigNumber.ROUND_UP);
    return piconero.toFixed(0);
  }
}
