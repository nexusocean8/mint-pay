import axios from 'axios';

// Browser-side: hits Next.js API routes (which proxy to NestJS)
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Server-side: Mint service
export const mintApi = axios.create();
mintApi.interceptors.request.use((config) => {
  config.baseURL = process.env.MINT_API_URL ?? 'http://localhost:8080/v1';
  config.headers['X-Admin-Api-Key'] = process.env.MINT_ADMIN_KEY ?? '';
  config.headers['X-Api-Key'] = process.env.MINT_API_KEY ?? '';
  return config;
});

export type Chain = 'xmr' | 'firo';

export function getChainApi(chain: Chain) {
  switch (chain) {
    case 'xmr':
    case 'firo':
    default:
      return mintApi;
  }
}

export function resolveChain(param: string | null | undefined): Chain {
  if (param === 'firo') return 'firo';
  return 'xmr';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getAuthApi(_chain?: Chain) {
  return mintApi;
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

export interface FiroWalletInfo {
  chain: 'firo';
  blockHeight: number;
  balance: number;
  hdMasterKeyId?: string;
  keypoolSize: number;
}

export type WalletInfo = XmrWalletInfo | FiroWalletInfo;

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
  head?: string;
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
