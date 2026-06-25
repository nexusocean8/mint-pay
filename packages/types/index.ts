export enum InvoiceStatus {
  Pending = 'pending',
  Seen = 'seen',
  Confirmed = 'confirmed',
  Underpaid = 'underpaid',
  Expired = 'expired',
  Cancelled = 'cancelled',
}

export enum Chain {
  Xmr = 'xmr',
  Firo = 'firo',
}

export enum Asset {
  Xmr = 'xmr',
  Firo = 'firo',
}

export interface ConfigResponseDto {
  enabledChains: Chain[];
}
