# techtrustkenya

Live site: **https://dan-geeks.github.io/techtrustkenya/**

TechTrust is a React + Supabase marketplace with TechTrust Float escrow:

1. Customer creates an order.
2. Customer pays by mobile-money STK Push.
3. Payment is marked `paid_float` and held.
4. Vendor delivers and marks the order delivered.
5. Customer confirms receipt.
6. A server-side payout is initiated to the vendor.
7. The order is only marked `released` after a simulator-final payout or a payment gateway payout callback/result confirms success.

## Payments

The escrow backend lives in [`server/`](server/README.md) — a Bun + Hono service
deployed on Railway. The frontend points at it via `VITE_RAILWAY_FUNCTION_URL`;
when that is blank it falls back to the Supabase edge functions in
`supabase/functions/`.

Collection runs through **DarajaPay** (`darajapay.app`) rather than talking to
Safaricom directly: set `PAYMENT_PROVIDER=darajapay` and
`DARAJAPAY_TILL_NUMBER=3399774`. DarajaPay holds the consumer key, passkey and
shortcode, so this repo needs no Daraja credentials and no public callback URL.
The trade-off is that DarajaPay owns the callback, so Response 2 only ever
arrives by polling — `/payment-status` queries its `/widget/status` for you.
Direct Daraja and KCB Buni remain available behind the same `PAYMENT_PROVIDER`
switch.

**An STK Push returns two responses.** The immediate reply to
`POST /mpesa-stkpush` (`ResponseCode: "0"`) means only that the M-Pesa PIN prompt
reached the customer's phone — *no money has moved*. The second response arrives
as a gateway callback, and it is the only proof of payment. Checkout therefore
pushes, saves the `CheckoutRequestID`, then polls `GET /payment-status` until the
status stops being `pending`. Never treat the push response as a completed
payment.

See [`server/README.md`](server/README.md) for the endpoint list, the required
credentials, and how to run the flow in sandbox.

## Hosting

`.github/workflows/deploy.yml` builds on every push to `main` and publishes
`dist/` to GitHub Pages. It is a *project* site, so it is served from the
`/techtrustkenya/` sub-path — `vite.config.ts` sets `base: "/techtrustkenya/"`
and `BrowserRouter` reads `basename={import.meta.env.BASE_URL}`. Any asset under
`public/` must be referenced as `` `${import.meta.env.BASE_URL}path` ``, never a
bare `/path`, or it will 404 once deployed. The build also copies `index.html`
to `404.html` so deep links survive a hard refresh.

The escrow API's `ALLOWED_ORIGINS` on Railway must include
`https://dan-geeks.github.io` or every call from the deployed site fails CORS.

## Local Development

```bash
npm install          # frontend
npm run dev

cd server            # escrow API
bun install
bun run dev
```

Copy `.env.example` to `.env` for local Vite settings, and
`server/.env.example` to `server/.env` for the escrow API. Only `VITE_*` values
belong in the root `.env` — they are bundled into the browser build, so a
service-role key or gateway secret must never go there.

## KCB Buni Sandbox

KCB Buni credentials are Supabase Edge Function secrets, not Vite browser env vars.

```bash
supabase secrets set PAYMENT_PROVIDER=kcb_buni
supabase secrets set KCB_BUNI_CONSUMER_KEY=your_consumer_key
supabase secrets set KCB_BUNI_CONSUMER_SECRET=your_consumer_secret
supabase secrets set KCB_BUNI_BASE_URL=https://uat.buni.kcbgroup.com
supabase secrets set KCB_BUNI_ORG_SHORTCODE=522522
supabase secrets set KCB_BUNI_CALLBACK_URL=https://<project-ref>.supabase.co/functions/v1/mpesa-callback
```

For a 1 KES sandbox payment test:

```bash
supabase secrets set PAYMENT_SANDBOX_MODE=true
supabase secrets set PAYMENT_TEST_AMOUNT_KSH=1
```

For vendor payout through KCB Buni Send Money, add the payout endpoint from your subscribed Buni API:

```bash
supabase secrets set PAYOUT_PROVIDER=kcb_buni
supabase secrets set KCB_BUNI_PAYOUT_URL=https://uat.buni.kcbgroup.com/<your-send-money-endpoint>
supabase secrets set KCB_BUNI_PAYOUT_CALLBACK_URL=https://<project-ref>.supabase.co/functions/v1/mpesa-callback
supabase secrets set KCB_BUNI_SOURCE_ACCOUNT=your_kcb_source_account
```

If Buni's payout request body differs from the default adapter, set `KCB_BUNI_PAYOUT_BODY_TEMPLATE` as JSON with placeholders:

```json
{
  "transactionReference": "{{reference}}",
  "sourceAccount": "{{sourceAccount}}",
  "phoneNumber": "{{phone}}",
  "amount": "{{amount}}",
  "callbackUrl": "https://<project-ref>.supabase.co/functions/v1/mpesa-callback"
}
```

Available placeholders: `{{orderId}}`, `{{reference}}`, `{{amount}}`, `{{phone}}`, `{{vendorName}}`, `{{sourceAccount}}`.

## Demo Simulator

The simulator is disabled unless explicitly enabled. Use it only in development or sandbox projects:

```bash
supabase secrets set PAYMENT_SIMULATION_ENABLED=true
supabase secrets set PAYOUT_SIMULATION_ENABLED=true
```

To show the simulator button in the frontend:

```bash
VITE_ENABLE_PAYMENT_SIMULATOR=true
```

## Deploying Supabase Changes

```bash
supabase db push
supabase functions deploy mpesa-stkpush
supabase functions deploy mpesa-callback --no-verify-jwt
supabase functions deploy release-float-payment
supabase functions deploy simulate-payment
```

The callback URL for both payment collection and payout result callbacks should point to:

```text
https://<project-ref>.supabase.co/functions/v1/mpesa-callback
```
