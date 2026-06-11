# Monero Payments API

NestJS payment processor for Monero (stagenet/mainnet). Single merchant, single account, unique subaddress per invoice. View-only operation — no spend key on the service host. Mongo-backed state, signed webhooks, scanner-driven confirmation tracking.

Schema is generalized (`chain`, `asset`, `assetDecimals`, `amountAtomic`, `addressIndex`) so the `invoices` / `payments` / `webhook_deliveries` collections can be shared with a sibling EVM service. This service only reads/writes its own `chain: 'xmr'` rows.

## Stack

- NestJS + TypeScript, Mongoose, axios, class-validator
- `monero-ts@^0.11.8` with `MoneroWalletFull` (in-process WASM wallet talking directly to `monerod`)
- BigInt piconero internally; string in API responses
- Swagger at `/docs` (non-prod)

## Architecture

```
config/      env validation
database/    mongoose connection
monero/      view-only MoneroWalletFull boot (open-or-create), in-process sync
auth/        ApiKeyGuard, AdminKeyGuard
settings/    live tunables (Mongo-backed, env-seeded)
price/       RateProvider abstraction (CMC initial impl)
invoices/    POST/GET, subaddress generation
payments/    transfer→invoice records
scanner/     wallet sync + state machine + Mongo lock
webhooks/    HMAC-signed delivery + retry
admin/       wallet info (view-only material) + settings
health/      live + ready + synced
```

## Setup

```bash
npm install
cp .env.example .env.monero
# fill in values, then:
npm run start:dev
```

### Required env

| Key                                         | Notes                                        |
| ------------------------------------------- | -------------------------------------------- |
| `MONGO_URI`                                 | Mongo connection string                      |
| `MONERO_DAEMON_URI` / `_USER` / `_PASSWORD` | Unrestricted `monerod` RPC; pool data needed |
| `MONERO_WALLET_PATH`                        | Filesystem path for the wallet file          |
| `API_KEY`                                   | ≥16 chars                                    |
| `ADMIN_API_KEY`                             | ≥16 chars                                    |
| `CMC_API_KEY`                               | CoinMarketCap key (when `RATE_PROVIDER=cmc`) |
| `WEBHOOK_SIGNING_SECRET`                    | HMAC secret for webhook signing              |

### View-only material (required on first boot only)

If no wallet file exists at `MONERO_WALLET_PATH`, the service creates one from these:

| Key                      | Notes                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `MONERO_VIEW_KEY`        | Private (secret) view key, 64 hex chars                                                                  |
| `MONERO_PRIMARY_ADDRESS` | Primary address (encodes public spend key)                                                               |
| `MONERO_RESTORE_HEIGHT`  | Block height at which the view key was generated, or any earlier block before the first expected payment |

Generate offline (e.g. `monero-wallet-cli` on an air-gapped machine). The service never sees a spend key.

### Optional env (with defaults)

| Key                              | Default                             | Live-editable? |
| -------------------------------- | ----------------------------------- | -------------- |
| `NODE_ENV`                       | `development`                       | no             |
| `PORT`                           | `3000`                              | no             |
| `MONGO_DB_NAME`                  | `monero_payments`                   | no             |
| `MONERO_NETWORK`                 | `stagenet`                          | no             |
| `RATE_PROVIDER`                  | `cmc`                               | no (restart)   |
| `CMC_BASE_URL`                   | `https://pro-api.coinmarketcap.com` | no             |
| `MONERO_PREWARM_SYNC`            | `true`                              | no (boot-only) |
| `SCANNER_INTERVAL_MS`            | `10000`                             | no (boot-only) |
| `WEBHOOK_DISPATCH_INTERVAL_MS`   | `5000`                              | no (boot-only) |
| `CONFIRMATION_DEPTH`             | `1`                                 | **yes**        |
| `INVOICE_DEFAULT_EXPIRY_SEC`     | `1200`                              | **yes**        |
| `INVOICE_MAX_EXPIRY_SEC`         | `1800`                              | **yes**        |
| `SCANNER_LOCK_TTL_MS`            | `30000`                             | **yes**        |
| `MONERO_SYNCED_THRESHOLD_BLOCKS` | `2`                                 | **yes**        |
| `RATE_CACHE_TTL_MS`              | `45000`                             | **yes**        |
| `WEBHOOK_MAX_ATTEMPTS`           | `8`                                 | **yes**        |
| `WEBHOOK_TIMEOUT_MS`             | `10000`                             | **yes**        |

Live-editable tunables are seeded from env on first boot into a Mongo `settings` doc. After that, env values are ignored — change them via `PUT /admin/settings`. Boot-only values stay on env and require restart.

## Infra (docker compose)

Single `monerod` container. No wallet RPC service. Mount a volume for the wallet directory (`MONERO_WALLET_PATH`'s parent).

Bind RPC ports to `127.0.0.1` only unless you intend public access. `monerod` must expose **unrestricted** RPC — the scanner relies on the `inTxPool` filter for pool transfers, which restricted endpoints do not return.

## Boot flow

`MoneroWalletProvider` evaluates in order:

1. **Open existing wallet file** at `MONERO_WALLET_PATH` if present.
2. **Create view-only wallet** from `MONERO_VIEW_KEY` + `MONERO_PRIMARY_ADDRESS` + `MONERO_RESTORE_HEIGHT`; persist to `MONERO_WALLET_PATH`.

Service refuses to boot if neither path succeeds.

Wallets have no password (no spend key to protect). Filesystem permissions on the mounted volume are the access control on the view key.

With `MONERO_PREWARM_SYNC=true` (default), `/health/ready` blocks until the wallet is caught up on initial sync. For multi-hour cold starts, either ship a pre-synced wallet file on the mounted volume, or set `MONERO_PREWARM_SYNC=false` and gate traffic on `/health/synced` instead.

## Endpoints

All paths prefixed `/v1`.

| Method | Path              | Auth              | Purpose                                               |
| ------ | ----------------- | ----------------- | ----------------------------------------------------- |
| GET    | `/health/live`    | none              | liveness                                              |
| GET    | `/health/ready`   | none              | mongo + wallet loaded + daemon                        |
| GET    | `/health/synced`  | none              | wallet height vs daemon tip                           |
| POST   | `/invoices`       | `X-Api-Key`       | create invoice                                        |
| GET    | `/invoices/:id`   | `X-Api-Key`       | fetch invoice                                         |
| GET    | `/admin/wallet`   | `X-Admin-Api-Key` | view key, primary address, restore height, sync state |
| GET    | `/admin/invoices` | `X-Admin-Api-Key` | list invoices (paginated, filterable by status)       |
| GET    | `/admin/settings` | `X-Admin-Api-Key` | get live tunables                                     |
| PUT    | `/admin/settings` | `X-Admin-Api-Key` | partial update of live tunables                       |

Invoice responses include `chain`, `asset`, `assetDecimals` for client-side unit conversion.

### Create invoice

```bash
curl -X POST http://localhost:3000/v1/invoices \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: $API_KEY" \
  -d '{"amountAtomic":"100000000","fiatCurrency":"USD"}'
```

`amountAtomic` is piconero for this service (1 XMR = 10¹² piconero). Optional: `expiresInSeconds`, `confirmationsRequired`, `webhookUrl`, `metadata`.

## Invoice lifecycle

```
pending → seen → confirmed
              ↘ underpaid
pending → expired
```

- `pending`: subaddress issued, no tx
- `seen`: incoming tx detected (pool or chain), expiry frozen
- `confirmed`: confirmations ≥ required AND received ≥ owed
- `underpaid`: confirmations met but total < owed
- `expired`: no tx by `expiresAt`

Note: `unlocked` check is intentionally disabled — invoices flip to `confirmed` at depth alone (`CONFIRMATION_DEPTH=1` by default). For mainnet high-value, raise `confirmationDepth` via `PUT /admin/settings` and/or re-enable the unlock check in `scanner.service.ts` `recomputeInvoice`.

## Webhooks

Signed `HMAC-SHA256` over `${timestamp}.${body}`. See `docs/webhooks.md` for full reference. Headers:

- `X-Api-Signature: t=<ts>,v1=<hex>`
- `X-Api-Event: invoice.{seen|confirmed|underpaid|expired}`
- `X-Api-Delivery-Id: <id>`

Retries with exponential backoff (30s base, capped 1h), max attempts and per-request timeout are live-editable via settings.

## Scanner

Polls every `SCANNER_INTERVAL_MS` (default 10s). Mongo-backed lock (`xmr-payment-scanner`) prevents overlapping ticks. Per tick: wallet sync → fetch incoming + pool transfers for active subaddresses → upsert payments → recompute invoice state → expire stale invoices. All invoice/payment queries filter by `chain: 'xmr'`.

## Network switch

Stagenet ↔ mainnet via `MONERO_NETWORK` env + matching `monerod` endpoint. No code changes. Raise `confirmationDepth` via settings for mainnet.

## Tests

E2E against running server. Hardcoded keys for now.

```bash
npm run test
```

Covers: health, invoices (auth, validation, create, fetch), admin (wallet info).

## Known limitations

- **No spend key on host by design.** Operator manages funds out-of-band with a separate wallet holding the spend key.
- **First sync can be long.** Initial restore-from-height may take hours. Pre-warm blocks `/health/ready`; ship a pre-synced wallet file or use `/health/synced` to gate traffic instead.
- **WASM startup adds a few seconds** to cold boot. Orchestrator readiness probes should tolerate it.
- **Wallet file loss = full re-sync** from `MONERO_RESTORE_HEIGHT`. No funds at risk (spend authority lives elsewhere), but recovery is slow.
- **monerod must expose unrestricted RPC.** Public/restricted nodes do not return pool transfers.
- **View key recoverable via admin endpoint** — the operator already holds it. Protect `ADMIN_API_KEY` accordingly.
- **Single instance only.** Settings cache is in-process; multi-instance would need change-streams or short-TTL re-reads.
- **Fiat amount on invoice is informational**, locked at creation via the configured rate provider.
- **`unlocked` check disabled** for fast confirmation; re-enable for high-value mainnet.
- **Key rotation requires restart.** Admin UI shows view material read-only; no live edit.
