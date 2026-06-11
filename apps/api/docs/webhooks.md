# Webhooks

The API delivers signed HTTP POST callbacks when an invoice's status changes. Configure delivery by setting `webhookUrl` on invoice creation.

## Delivery

- Method: `POST`
- Content-Type: `application/json`
- Timeout: 10s default, live-configurable via `PUT /admin/settings` (`webhookTimeoutMs`)
- Redirects: not followed
- Success: any `2xx` response marks the delivery as delivered
- Retry: any non-`2xx`, timeout, or network error triggers retry

### Retry schedule

Exponential backoff starting at 30s, doubling each attempt, capped at 60 minutes. Default max attempts: 8 (≈2h total window). After max attempts the delivery is marked `dead_lettered` and not retried automatically.

### Idempotency

Each `(invoiceId, event)` pair is delivered at most once. Each delivery payload also includes a unique `id` (UUID) so receivers can deduplicate independently if needed.

## Headers

| Header              | Description                             |
| ------------------- | --------------------------------------- |
| `X-Api-Signature`   | `t=<unix_seconds>,v1=<hmac_sha256_hex>` |
| `X-Api-Event`       | Event type (see below)                  |
| `X-Api-Delivery-Id` | Unique delivery id (Mongo ObjectId)     |

## Signature verification

The signature is computed as:

```
HMAC_SHA256(WEBHOOK_SIGNING_SECRET, "{timestamp}.{raw_body}")
```

Where `timestamp` is the value from `X-Api-Signature` (the `t=` field) and `raw_body` is the exact request body bytes (do not re-serialize).

Receivers should:

1. Parse `t` and `v1` from `X-Api-Signature`.
2. Reject if `t` is older than 5 minutes (replay protection).
3. Recompute the HMAC and compare using a constant-time comparison.

### Node.js example

```ts
import { createHmac, timingSafeEqual } from 'crypto';

function verify(rawBody: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')));
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const age = Math.floor(Date.now() / 1000) - parseInt(t, 10);
  if (age > 300) return false;
  const expected = createHmac('sha256', secret)
    .update(`${t}.${rawBody}`)
    .digest('hex');
  const a = Buffer.from(v1);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
```

> Use a raw-body-preserving middleware (e.g. `express.raw({ type: 'application/json' })` on the webhook route). Re-serialized JSON will not match.

## Events

| Event               | Fires when                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| `invoice.seen`      | First incoming tx detected paying the invoice address (pool or chain). Expiry timer freezes.                 |
| `invoice.confirmed` | Confirmation depth met and total received ≥ amount owed.                                                     |
| `invoice.underpaid` | Confirmation depth met but total received < amount owed. Additional payments may still complete the invoice. |
| `invoice.expired`   | Invoice expired with no incoming tx detected.                                                                |

## Payload

```json
{
  "id": "9b2c3d4e-1234-4abc-9def-0123456789ab",
  "event": "invoice.confirmed",
  "timestamp": "2026-05-06T12:38:14.123Z",
  "data": {
    "invoiceId": "6630f0c8a1b2c3d4e5f6a7b8",
    "chain": "xmr",
    "asset": "xmr",
    "assetDecimals": 12,
    "status": "confirmed",
    "address": "75qTVmM8Kd2MRCxWMyiYBkcwSM6iKdvq17MuQoM7xHV5dkLZ55PDhsYG8dDK9YcLnN9BqdoYAWDYPaecUA3gJipiC9sPXya",
    "amountAtomic": "100000000",
    "receivedAtomic": "100000000",
    "confirmations": 1
  }
}
```

Amounts are atomic units as strings to preserve precision. Use `assetDecimals` to convert (XMR: piconero, 10¹² per unit).

`data` fields are present on a best-effort basis per event; receivers should treat unknown fields as forward-compatible.

## Testing

In development you can point `webhookUrl` at services like [webhook.site](https://webhook.site) or run a local listener. Signature verification can be skipped during initial integration but must be enabled in production.
