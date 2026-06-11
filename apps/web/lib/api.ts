import axios from 'axios';

// Browser-side: hits Next.js API routes (which proxy to NestJS)
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Server-side: XMR service
export const xmrApi = axios.create();
xmrApi.interceptors.request.use((config) => {
  config.baseURL = process.env.XMR_API_URL ?? 'http://localhost:3000/v1';
  config.headers['X-Admin-Api-Key'] = process.env.XMR_ADMIN_KEY ?? '';
  config.headers['X-Api-Key'] = process.env.XMR_API_KEY ?? '';
  return config;
});

// Server-side: EVM service
export const evmApi = axios.create();
evmApi.interceptors.request.use((config) => {
  config.baseURL = process.env.EVM_API_URL ?? 'http://localhost:3001/v1';
  config.headers['X-Admin-Api-Key'] = process.env.EVM_ADMIN_KEY ?? '';
  config.headers['X-Api-Key'] = process.env.EVM_API_KEY ?? '';
  return config;
});

export type Chain = 'xmr' | 'evm';

export function getChainApi(chain: Chain) {
  switch (chain) {
    case 'evm':
      return evmApi;
    case 'xmr':
    default:
      return xmrApi;
  }
}

export function resolveChain(param: string | null | undefined): Chain {
  return param === 'evm' ? 'evm' : 'xmr';
}

export function getAuthApi(chain?: Chain) {
  return chain === 'evm' ? evmApi : xmrApi;
}

// Types

export type InvoiceStatus =
  | 'pending'
  | 'seen'
  | 'confirmed'
  | 'underpaid'
  | 'expired'
  | 'cancelled';

export interface Invoice {
  id: string;
  chain: string;
  asset: string;
  assetDecimals: number;
  address: string;
  addressIndex: number;
  amountAtomic: string;
  amountFiat: number;
  fiatCurrency: string;
  rate: number;
  rateLockedAt: string;
  status: InvoiceStatus;
  confirmationsRequired: number;
  confirmations: number;
  receivedAtomic: string;
  createdAt: string;
  expiresAt: string;
  firstSeenAt?: string;
  paidAt?: string;
  webhookUrl?: string;
  chainData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface InvoiceListResponse {
  data: Invoice[];
  total: number;
  page: number;
  limit: number;
}

export interface XmrWalletInfo {
  chain: 'xmr';
  primaryAddress: string;
  viewKey: string;
  restoreHeight: number;
  walletHeight: number;
  daemonHeight: number;
  synced: boolean;
}

export interface EvmWalletInfo {
  chain: 'evm';
  treasuryAddress: string;
  network: string;
  walletEnabled: boolean;
  blockHeight: number;
  synced: boolean;
}

export type WalletInfo = XmrWalletInfo | EvmWalletInfo;

export interface HealthCheck {
  ok: boolean;
  detail?: string;
}

export interface HealthReady {
  status: 'ok' | 'degraded';
  checks: Record<string, HealthCheck>;
}

export interface HealthSynced {
  status: 'ok' | 'syncing';
  walletHeight: number;
  daemonHeight: number;
  behind: number;
  head?: string
}

export interface Settings {
  confirmationDepth: number;
  invoiceDefaultExpirySec: number;
  invoiceMaxExpirySec: number;
  scannerLockTtlMs: number;
  syncedThresholdBlocks: number;
  rateCacheTtlMs: number;
  webhookMaxAttempts: number;
  webhookTimeoutMs: number;
}
