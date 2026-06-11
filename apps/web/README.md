# Payments Admin Dashboard

Next.js admin dashboard for managing XMR and EVM payment services.

## Stack

- Next.js 16 (App Router)
- TypeScript, Tailwind CSS
- TanStack Query, Axios, Jose

## Features

- Multi-chain support (XMR / EVM) via sidebar chain selector
- Overview — live, ready, and sync health checks per chain
- Invoices — paginated list with status filtering and detail view
- Wallet — chain-specific wallet info (XMR: view key, sync state; EVM: treasury address, block height)
- Settings — live-editable backend tunables per chain
- Profile — admin email/password management
- Server-side API proxying — keys never exposed to the browser

## Setup

```bash
cp .env.local.example .env.local
# fill in values
pnpm install
pnpm dev
```

## Environment Variables

| Key | Description |
|---|---|
| `JWT_SECRET` | Must match `JWT_SECRET` on both backend services |
| `XMR_API_URL` | XMR service base URL (e.g. `https://payments.example.com/xmr/v1`) |
| `XMR_ADMIN_KEY` | XMR service admin API key |
| `XMR_API_KEY` | XMR service API key |
| `EVM_API_URL` | EVM service base URL (e.g. `https://payments.example.com/evm/v1`) |
| `EVM_ADMIN_KEY` | EVM service admin API key |
| `EVM_API_KEY` | EVM service API key |

## Deployment

```bash
docker build -t payments-admin .
docker run -p 3000:3000 --env-file .env.local payments-admin
```

Or via the provided `docker-compose.yml` alongside the payment services.

## Auth

Session is stored as an `httpOnly` cookie. The JWT is issued by the backend and verified server-side on every request. `JWT_SECRET` must be identical across all three services.