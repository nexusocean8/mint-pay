# Mint Pay

A self-hosted payment processor for privacy-focused cryptocurrencies. Accepts payments in fixed fiat amounts and notifies your application via webhooks. Currently supports Firo and Monero.

## Roadmap

### Phase 1 — Core Payment Processor

- [x] Invoice-based payments
- [x] Multi-chain support (Firo, XMR)
- [x] Authenticated webhooks
- [x] Admin dashboard
- [x] Docker deployment

### Phase 2 — Merchant Focus

- [ ] 2FA
- [x] Per-invoice coin selection
- [ ] Invoice memos

### Phase 3 — Developer Experience (TBA)

---

## Stack

- **Monorepo:** Turborepo + pnpm workspaces
- **Frontend:** Next.js (App Router)
- **Backend:** NestJS 11, MongoDB 8
- **Coins:** Firo and Monero

---

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 11+
- Docker + Docker Compose

```bash
pnpm install
pnpm dev
```

Starts the admin dashboard on port 3000 and the API on port 8080.

---

## Usage

### Create an invoice

```bash
curl -X POST http://localhost:8080/v1/invoices \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: $API_KEY" \
  -d '{"amountAtomic":"100000000","fiatCurrency":"USD","chain":"firo"}'
```

`amountAtomic` is in the chain's atomic unit — satoshis for Firo (10⁸ per FIRO), piconero for XMR (10¹² per XMR). Optional fields: `expiresInSeconds`, `confirmationsRequired`, `webhookUrl`, `metadata`.

### Fetch an invoice

```bash
curl http://localhost:8080/v1/invoices/<id> \
  -H "X-Api-Key: $API_KEY"
```

---

## Invoice Statuses

| Status      | Description                |
| ----------- | -------------------------- |
| `pending`   | Awaiting payment           |
| `seen`      | Incoming tx detected       |
| `confirmed` | Payment complete           |
| `underpaid` | Confirmed but amount short |
| `expired`   | Expired with no tx         |
| `cancelled` | Manually cancelled         |
