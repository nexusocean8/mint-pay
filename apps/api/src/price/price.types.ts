export interface PriceQuote {
  /** XMR per 1 unit of fiat */
  xmrPerFiat: number;
  /** Fiat per 1 XMR */
  fiatPerXmr: number;
  fiatCurrency: string;
  fetchedAt: Date;
  source: string;
}

interface CmcQuoteResponse {
  data: {
    [symbol: string]: Array<{
      id: number;
      symbol: string;
      quote: {
        [fiat: string]: {
          price: number;
          last_updated: string;
        };
      };
    }>;
  };
  status: {
    error_code: number;
    error_message: string | null;
  };
}

export type { CmcQuoteResponse };
