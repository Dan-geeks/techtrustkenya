# TechTrust Kenya — project state

Last updated: **2026-08-03**

A single place to pick the project back up from. Everything below is verified
against the live database, the live Railway services and the deployed site, not
recalled from memory.

---

## 1. Where everything lives

| Thing | Value |
|---|---|
| Repo | `~/techtrustkenya` → `github.com/Dan-geeks/techtrustkenya` |
| Working branch | `fix/order-tracker-chat-realtime-and-railway-migration` — **not merged to `main`** |
| Live site | https://techtrustkenya.web.app |
| Firebase | project `stkpush-cff51`, hosting site `techtrustkenya`. No `.firebaserc` — every command needs `--project stkpush-cff51` |
| Supabase | project ref **`okvgadkyknfknqtxnjzz`** ("tech-trust-kenya", eu-west-1) |
| Escrow API | https://techtrust-escrow-api-production-b177.up.railway.app |
| Railway account | **John Kart / kartjohn50@gmail.com**, project + service `techtrust-escrow-api` |
| Payment gateway | DarajaPay → https://darajapay-api-production-2fea.up.railway.app (source: `~/darajapay-api`) |

### Deploy commands

```powershell
# frontend
cd ~/techtrustkenya
npm run build
firebase deploy --only hosting:techtrustkenya --project stkpush-cff51

# escrow API  (railway variables --set does NOT reliably redeploy)
cd ~/techtrustkenya/server
railway up --ci
```

### Running SQL against production

There is no `psql` here. Use the Supabase Management API. The token is in
**Windows Credential Manager**, target `Supabase CLI:supabase`, and the blob must
be decoded as **UTF-8** (the `CharSet.Unicode` default returns mojibake). A ready
made runner is at
`%TEMP%\claude\...\scratchpad\sql.ps1` — recreate it from the CredRead P/Invoke
if the scratchpad is gone.

```
POST https://api.supabase.com/v1/projects/okvgadkyknfknqtxnjzz/database/query
Authorization: Bearer <sbp_…>
{ "query": "select 1" }
```

To test RLS-sensitive behaviour safely, wrap in `begin; … rollback;` and simulate
a session:

```sql
set local role authenticated;
set local request.jwt.claims = '{"sub":"<user-uuid>","role":"authenticated"}';
```

---

## 2. Money — read this before touching payments

**An STK Push returns TWO responses.** Response 1 (`POST /darajapay/stkpush` →
`CheckoutRequestID`, `ResponseCode`) only means the PIN prompt was delivered.
No money has moved. Response 2 arrives by polling
`GET /widget/status?id=<CheckoutRequestID>`, which the escrow API's
`/payment-status` does for you. Never deliver anything on Response 1.

Current state:

- `paymentProvider: darajapay`, `sandboxMode: false` → **real money, real
  amounts**. Verified end to end with M-Pesa receipts `UH3KF1LVXA`,
  `UH3KF1NTKW`, `UH3KF1NQS5`.
- **Collections land in DarajaPay's till 3399774**, not a TechTrust till. Money
  arrives, but in DarajaPay's account.
- **`payoutProvider` is still `simulation`.** Float is collected but never paid
  out to a vendor. Needs Safaricom B2C `MPESA_INITIATOR_NAME` +
  `MPESA_SECURITY_CREDENTIAL`, which exist nowhere on this machine.
- The 1-bob test cap needs **both** `PAYMENT_SANDBOX_MODE=true` and
  `PAYMENT_TEST_AMOUNT_KSH=1`. "Sandbox" here is TechTrust's own amount cap, not
  Safaricom's sandbox — pushes always hit the live Daraja API.
- `paid_amount_ksh` records the **order total, not the capped charge**, so GMV
  figures gathered while capped are overstated.

### The trap that cost hours

`railway variables` **table output truncates every value at 40 characters.**
DarajaPay's Daraja credentials had been set from that clipped display (real key
is 48 chars, secret 64, passkey 64). Safaricom answers `HTTP 400` with an empty
body for both truncated and revoked credentials, so the response tells you
nothing.

**Always use `railway variables --json`. Never re-`--set` a value read from the
table.**

---

## 3. Email — built, deployed, needs one key

Before today the platform sent **no email at all**: Supabase has no custom SMTP
(`smtp_host` empty, `mailer_autoconfirm: true`), and DarajaPay's
`welcome-email.js` was written but never given a key.

`server/email.ts` now implements three messages through **Resend**, using the
same env-var names as DarajaPay so a single key serves both products:

| Message | Trigger |
|---|---|
| Welcome (customer / vendor variants) | `POST /email/welcome`, fired fire-and-forget by the client after signup — both password signup (`Auth.tsx`) and Google OAuth (`AuthCallback.tsx`) |
| Payment received (buyer receipt) | inside `settleIntoFloat()`, after the order is safely marked paid |
| New paid order (vendor) | same place |

Design rules: every send is best-effort, returns a result object instead of
throwing, and is deduped. A signup or a settled payment must never fail because
mail did not go out.

**To switch it on**, set one variable on Railway:

```powershell
cd ~/techtrustkenya/server
railway variables --set "RESEND_API_KEY=re_xxxxxxxx"
railway up --ci
```

Already set: `SITE_URL=https://techtrustkenya.web.app`,
`SUPPORT_EMAIL=support@techtrustkenya.co.ke`.

Two gotchas when you do:

1. Until a domain is verified in Resend, it will **only deliver to the Resend
   account owner's own address** — everything else returns `403
   validation_error`. Verify `techtrustkenya.co.ke`, then set
   `RESEND_FROM="TechTrust <noreply@techtrustkenya.co.ke>"`.
2. You cannot send as `@gmail.com`. Gmail's DMARC record blocks third parties.

Check status any time at
`https://techtrust-escrow-api-production-b177.up.railway.app/config-check` →
`email.configured`.

---

## 4. Repair technicians — the vetting flow

Ticking "I offer repair services" used to set a boolean and nothing else: the
admin never saw it, and `/repairs` listed anyone with the flag, unvetted.

Now the flag files an **application**:

```
vendor ticks offers_repairs
        ↓  (sync_repair_application trigger)
repair_application_status = 'pending'   → all admins notified
        ↓  admin clears 3 checks in Admin → Repairs → Technicians
repair_step_identity / repair_step_skills / repair_step_safety
        ↓  admin clicks "Approve & list"  (disabled until 3/3)
repair_application_status = 'approved'  → vendor notified
        ↓
listed on /repairs and in the /book-repair technician picker
```

Columns added to `vendor_profiles`: `repair_application_status`,
`repair_step_identity`, `repair_step_skills`, `repair_step_safety`,
`repair_applied_at`, `repair_approved_at`, `repair_approved_by`,
`repair_rejection_reason`, `repair_specialties`.

Two things worth knowing:

- **A vendor cannot vet themselves.** `"Users can update own vendor profile"` is
  a broad policy on `user_id`, so without a guard a vendor could PATCH
  `repair_application_status = 'approved'` straight from the browser. The
  `protect_repair_vetting_columns` BEFORE trigger forces every review column
  (and `verification_status`) back to its old value for anyone without the admin
  role. Confirmed by simulating the vendor's JWT.
- **The notify trigger is `after insert or update`, not `after update of
  repair_application_status`.** That clause fires on the columns *named in the
  UPDATE statement*, not on what a BEFORE trigger changed — and the commonest
  path is a vendor toggling `offers_repairs` alone with the status derived. The
  narrow version silently swallowed exactly that case.

Unticking the box withdraws the application and clears all three checks, so
re-applying starts clean rather than inheriting stale ticks.

### The `/repairs/:id` 404

`routeForNotification()` has always turned a `repair_update` notification into
`/repairs/<reference_id>`, but that route was never registered — so every repair
notification landed on the 404 page, and a customer who booked a repair could
never look at it again. `src/pages/RepairDetail.tsx` now serves it, for both the
customer and the vendor, off the existing RLS.

Fixed alongside it, all in the same flow:

- Nothing anywhere ever set `customer_approved_quote`, so a quote could be sent
  but never accepted and the vendor's "Mark received" button stayed disabled
  forever. The customer approves or declines on the detail page.
- The admin's repair table read `device_type` / `device_model` /
  `issue_description` — none of which exist. The real columns are
  `device_description` and `problem_description`.
- `repair_requests` had SELECT policies for the customer and the vendor and
  **none for admins**, so the admin tab was empty regardless of content. It read
  as "no repair requests found" rather than a permissions problem.

**Watch for this shape of bug**: a link built from an id of the wrong type. The
vetting notifications originally carried a `vendor_profiles` id on a
`repair_update`, which would have rebuilt the same 404 from a different
direction. A cheap guard is the assertion in the test suite that every
`repair_update` `reference_id` resolves to a real `repair_requests` row.

---

## 5. Accounts and access

| Email | Role | Note |
|---|---|---|
| `johnmwangimegwe@gmail.com` | **admin** | the client's account |
| `labcoatsxd@gmail.com` | **admin** | dev account — remove before handover |
| `mwangijohnmegwe@gmail.com` | — | look-alike duplicate, admin **revoked** 2026-08-03 |
| `mwangimegwejohn@gmail.com`, `megwejohnmwangi@gmail.com` | — | more duplicates, never had admin |

**`VITE_DEMO_AUTH_BYPASS="true"` is still live** — the site currently accepts any
email/password combination. Turn this off before anyone real uses it.

---

## 6. Known-good verification results

Run against the live database inside `begin … rollback`:

Repair vetting — 8/8:
1. vendor self-approve blocked · 2. approve with 2/3 checks rejected ·
3. admin approval with 3/3 stamps `repair_approved_at` · 4. vendor notified ·
5. anon sees the approved technician on `/repairs` · 6. untick withdraws and
clears checks · 7. re-tick files a fresh application · 8. every admin notified.

Product technical specifications — 5/5, both add and edit:
Processor, Memory, Storage, Display, Condition Notes and Device ID all persist
and update; a partly-filled set stays partial rather than padding the product
page with empty rows; anonymous shoppers can read them.

Frontend `tsc --noEmit` clean, `npm run build` clean, `server/` `tsc --noEmit`
clean.

---

## 7. Outstanding

Roughly in priority order:

1. **Set `RESEND_API_KEY`** — email is built and deployed but inert without it.
2. **Turn off `VITE_DEMO_AUTH_BYPASS`** — anyone can sign in as anyone.
3. **Vendor payouts don't work.** `payoutProvider: simulation`. Needs Safaricom
   B2C credentials.
4. **Collections go to DarajaPay's till**, not TechTrust's.
5. **Merge the working branch to `main`.** It has been the de-facto trunk for
   days.
6. **Rotate the M-Pesa credentials.** Paybill 6781822's consumer key, secret and
   passkey are in `Dan-geeks/railway`'s public git history and still
   authenticate against `api.safaricom.co.ke`.
7. Duplicate **"TechHub Kenya"** vendor — one has an owner, one is an ownerless
   seed leftover. Clean up before a client demo.
8. Remove the dev admin (`labcoatsxd@gmail.com`) at handover.

---

## 8. Environment traps on this machine

- **The Read tool cannot open PDFs** (no poppler). Render with PyMuPDF at
  `dpi=140` and read the PNGs instead.
- `src/integrations/supabase/types.ts` has twice been written as **UTF-16**,
  which makes `grep` silently find nothing. Regenerate with
  `npx supabase gen types typescript --project-id okvgadkyknfknqtxnjzz` and write
  it back as **UTF-8 without BOM**.
- The Supabase CLI is a devDependency, not on PATH — use `npx supabase …`.
- PowerShell here-strings passed to `git commit -m` get mangled. Write the
  message to a file and use `git commit -F <file>`.
- A BOM (U+FEFF) once corrupted `server/index.ts` and several Railway variables.
  It was real but was **not** the cause of the Daraja 400s — don't re-chase it.
