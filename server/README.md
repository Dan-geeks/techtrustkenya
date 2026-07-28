# TechTrust Float — escrow API

The payment backend for TechTrust. Bun + Hono, deployed on Railway.

It replaces the old root-level `railway-function.ts`, whose `/mpesa-stkpush`
returned `503` for anything other than a simulated payment and whose
`/mpesa-callback` only logged the gateway's confirmation and threw it away — so
no real payment could ever be recorded.

## The escrow flow

```
customer                    escrow API                     M-Pesa / KCB
   |                            |                                |
   |  POST /mpesa-stkpush ----->|                                |
   |                            |---- STK push request --------->|
   |                            |<--- CheckoutRequestID ---------|   Response 1
   |<-- {status: "pending"} ----|   (saved on the order)         |
   |                            |                                |
   |  ...enters M-Pesa PIN...                                    |
   |                            |<--- POST /mpesa-callback ------|   Response 2
   |                            |     mark_order_paid()          |
   |  GET /payment-status ----->|                                |
   |<-- {status: "paid"} -------|   funds now held in Float      |
   |                            |                                |
   |  (delivery happens)        |                                |
   |  POST /release-float-...-->|---- B2C payout -------------->|
   |                            |<--- POST /payout-result -------|
   |                            |     order marked "released"    |
```

**An STK Push returns two responses.** Response 1 (`ResponseCode: "0"`) means
only that the PIN prompt reached the handset — *no money has moved*. Response 2
is the callback, and it is the only proof of payment. `CheckoutRequestID` is the
reference linking the two, which is why it is persisted to
`orders.mpesa_transaction_id` before the push endpoint returns.

## Endpoints

| Method | Path | Auth | Purpose |
| ------ | ---- | ---- | ------- |
| `GET` | `/health` | — | Railway healthcheck |
| `GET` | `/config-check` | — | What is configured (booleans only, no values) |
| `POST` | `/mpesa-stkpush` | Customer JWT | Send the STK prompt (Response 1) |
| `GET` | `/payment-status?order_id=` | Customer JWT | Response 2 — poll until not `pending` |
| `POST` | `/mpesa-callback/:secret` | Shared secret | Gateway payment confirmation |
| `POST` | `/release-float-payment` | Customer JWT | Release Float to the vendor |
| `POST` | `/payout-result/:secret` | Shared secret | Gateway payout confirmation |
| `POST` | `/payout-timeout/:secret` | Shared secret | Gateway payout timeout |
| `POST` | `/simulate-payment` | Customer JWT | Sandbox-only settlement |
| `POST` | `/create-vendor-profile` | Customer JWT | Vendor onboarding |
| `POST` | `/notify-vendor-approved` | Admin JWT | Vendor approval notice |

## What makes the escrow safe

- **Settlement is idempotent.** `mark_order_paid` returns early unless the order
  is still `pending`, so a retried gateway callback cannot decrement stock twice
  or double-notify.
- **Payouts are claimed before they are sent.** `payout_status` flips to
  `pending` *before* the B2C call, so a double-click cannot pay a vendor twice.
- **Lost callbacks self-heal.** If the callback never arrives, `/payment-status`
  queries Daraja's STK Push Query API directly and settles from the result. A
  customer who has already been debited is never left stuck on `pending`.
- **Callbacks are always ACKed** with `200`. Returning an error makes Safaricom
  retry the same callback for hours.
- **The sandbox cannot leak into production.** `PAYMENT_TEST_AMOUNT_KSH` is
  ignored unless `PAYMENT_SANDBOX_MODE` is true, and simulation mode must be
  explicitly enabled — it is never a silent fallback when credentials are absent.

## Local development

```bash
cd server
bun install
cp .env.example .env      # fill in your own values
bun run dev               # http://localhost:3000
bun test                  # unit tests, no network required
```

`GET /config-check` reports which credentials the running instance can see —
start there when a payment fails.

## Deploying to Railway

```bash
cd server
railway link                       # pick project + service
railway variables --set "KEY=value" --set "..."
railway up
```

Required before live payments will work:

| Variable | Where to get it |
| -------- | --------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API |
| `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` | developer.safaricom.co.ke → your app |
| `MPESA_SHORTCODE` / `MPESA_PASSKEY` | Daraja app (sandbox paybill is `174379`) |
| `MPESA_CALLBACK_SECRET` | Generate one: `openssl rand -hex 32` |

For payouts, add `MPESA_INITIATOR_NAME` and `MPESA_SECURITY_CREDENTIAL`.

Then register the callback URL shown by `/config-check` on the Daraja portal.

## Sandbox test drive

Daraja sandbox will not debit a real phone, so use the built-in simulator to
walk the whole escrow flow:

```bash
railway variables --set "PAYMENT_PROVIDER=simulation" --set "PAYMENT_SIMULATION_ENABLED=true" --set "PAYMENT_SANDBOX_MODE=true" --set "PAYMENT_TEST_AMOUNT_KSH=1"
```

Checkout then settles instantly into Float, and Order Detail can release it.
Set `PAYMENT_PROVIDER=safaricom_daraja` and clear the simulation flags to go
live.
