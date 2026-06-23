# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Overview

"Cashless Schweindl" — a digital piggy bank. A physical piggy bank carries an NFC tag that opens a fixed URL (`/jar/{id}`). Anyone who taps the tag can deposit money; the dashboard shows progress toward a savings goal. Hardware (ESP32 + LED ring + PIR sensor) is a later phase, designed to read the same Firebase structure.

**Why:** physical coins are dying out, but the ritual of "dropping money into the piggy bank" is still appealing. This recreates that ritual digitally, shareable across a household/family.

## Stack

- Vanilla JS PWA — single `index.html`, no build step, no framework, no npm `package.json` for the frontend
- Firebase Realtime Database — client talks to Firebase directly from the browser (compat SDK v10 via CDN)
- Vercel for hosting + a small set of serverless functions (`api/*.js`) for Stripe — this is the **one deviation** from "no backend": Stripe requires a secret key that can never live in client code
- Stripe REST API called directly via `fetch()` in the serverless functions — **no `stripe` npm package**, to avoid introducing a build step for a project that otherwise has none

## Routing

- `/jar/{id}` → dashboard, `/jar/{id}/pay` → payment screen, both rewritten to `index.html` via `vercel.json`; the page parses `window.location.pathname` itself
- `jarId` defaults to `'demo'` only when the path doesn't match (used for local testing fallback)
- `DEMO_MODE` is `true` only when `FIREBASE_CONFIG.apiKey` still starts with `REPLACE` (i.e., Firebase was never configured) — once real keys are in, every jar (including `demo`) goes through the live Firebase listener

## Onboarding & Reset

- `/jars/{id}.onboarded` (boolean) gates whether the dashboard/payment screen or the onboarding flow renders. Missing or `false` → onboarding.
- Onboarding: 3 steps (name, savings goal, "where should the money be collected" — currently a free-text field for a PayPal.me link/email, **not** a real account connection; real payouts are deferred to Stripe).
- "Schweinchen zurücksetzen" in Settings archives the full current jar to `/archive/{id}/{timestamp}` (not reachable from the UI, only directly in Firebase) and resets the live jar to `{onboarded: false}`.

## Payments (Stripe)

**Critical architecture decision:** the saved card belongs to the **device/browser that taps**, not to the jar. Each payer's `stripeCustomerId`/`stripePaymentMethodId` (plus `payerCardBrand`/`payerCardLast4` for display) lives in that device's `localStorage`, never on `/jars/{id}`. The reasoning: anyone can tap any jar's NFC tag, and if the card were stored on the jar, every tapper would silently charge the jar owner's card. Each tap embeds its own payer's Stripe IDs directly on the tap record.

- First tap on a new device shows a one-time card-capture gate on the payment sheet (`#pay-card-gate`, Stripe Elements + SetupIntent). After that, swiping is frictionless on that device for any jar. The same gate can also be reached from "Zahlungen verwalten" → "Karte hinterlegen" (`goToCardCapture()`), shown only when the device has no saved card.
- Taps write `status: 'pending'` when the device has a saved payment method, otherwise `status: 'confirmed'` immediately (no real money moves — this preserves the original fake-payment prototype behavior for anyone who hasn't set up a card).
- `total` on the jar updates optimistically on every tap regardless of pending/confirmed status.

### Abrechnungs-Logik (when a payer actually gets charged)

Billing decisions are made **per payer, never jar-wide** — Stripe charges a fee per transaction, so lumping all of a jar's pending money into one charge regardless of who it came from would be the wrong unit of accounting. `/api/charge-jar.js` is the single place this logic lives:

1. Load the jar, collect all taps with `status === 'pending'`.
2. Group them by payer — the group key is `stripeCustomerId` + `stripePaymentMethodId` (taken from each tap, not from the jar). Each group accumulates a sum and tracks its **oldest** tap's timestamp.
3. For each payer group, decide whether to charge **now**:
   - **Auto mode** (`force` not set in the request body): charge this payer only if `sum >= jar.payoutThreshold` (default €15, configurable per jar in "Zahlungen verwalten") **or** `now - oldestTimestamp >= 30 days` — whichever comes first. Otherwise the group is skipped (`status: 'below_threshold'` in the response) and stays pending for next time.
   - **Manual / force mode** (`force: true`): every payer group with pending money is charged immediately, ignoring threshold and age. Triggered by the "Jetzt abrechnen" button in "Zahlungen verwalten" (`chargeNow()` → `POST /api/charge-jar` with `{ jarId, force: true }`).
4. A charged group becomes one Stripe PaymentIntent (`off_session: true, confirm: true`) against that payer's saved card — never against another payer's card, even within the same jar. On success, only that group's taps flip to `status: 'confirmed'`.

**Who triggers the auto-check, and when:** the dashboard's live Firebase listener (`db.ref('jars/{id}').on('value', ...)`) calls `maybeAutoCharge(data)` on *every* snapshot update — i.e. after every tap, by whoever is currently viewing that jar's dashboard. `maybeAutoCharge` does a cheap client-side pre-check (any pending taps at all?) and if so pings `/api/charge-jar` without `force`; the server applies the per-payer threshold/age rule above. There is no cron job — billing only gets evaluated when someone has the dashboard open, which is an accepted limitation for a prototype (see Open TODOs: Stripe webhook / scheduled job would be needed for jars nobody revisits).

- No Stripe webhook yet — confirmation is synchronous, read directly from the PaymentIntent response. A webhook would be needed for async edge cases (e.g. 3D Secure retries) and for billing jars that nobody's dashboard is currently open for; deliberately deferred.
- `middleware.js` excludes `api/` from the Basic Auth gate so these endpoints (and any future webhook) are reachable without the site password.

## Top Bar & Action Sheets (Dashboard)

- Two icon buttons top-right (no bottom nav — tried and reverted): **Einstellungen** (gear, `right:18px`) and **Zahlungen verwalten** (card icon, `right:62px`, 16px left of the gear). Both open full-screen-ish bottom sheets (`#settings-overlay` / `#payments-overlay`), same slide-up pattern as the payment sheet.
- The "Zahlungen verwalten" icon doubles as a status indicator: gray circle + checkmark when this device has a saved card, **red circle + exclamation mark** when it doesn't (`updatePaymentsIconStatus()`, called on dashboard load, after saving a card, and after forgetting one).
- **Einstellungen** sheet: jar-level only — name, goal, "Schweinchen zurücksetzen". No payment-related settings here.
- **Zahlungen verwalten** sheet: device-level card status (brand badge + masked `XXXX XXXX XXXX 1234`, fetched via `/api/payment-method-info.js` since Stripe.js doesn't return card details after `confirmCardSetup`) with "Karte vergessen"/"Karte hinterlegen" depending on state, plus the jar's `payoutThreshold` and "Jetzt abrechnen".
- Payment screen is a full-screen action sheet (`#s-pay`, slides up via `.show` class + `transform`), not a separate page — opened via `history.pushState('/jar/{id}/pay')` and `openPaymentSheet()`, closed via `history.pushState('/jar/{id}')` and `closePaymentSheet()`. Direct NFC deep links to `/jar/{id}/pay` still work: the dashboard always initializes first, then the sheet opens itself if the URL matches on load. A `popstate` listener keeps browser back/forward in sync. `resetPaymentSheetState()` must run on every open — since the sheet persists across open/close (no more full reloads), leftover animation classes (checkmark drawn, pig wiggled, vanished amount card) would otherwise carry over from the previous tap.

## Asset Conventions

- Icons/illustrations: inline SVG, always — see parent repo's `CLAUDE.md` for the general rule (strip Figma background rects / page-context wrappers, keep only the meaningful path).
- **One deliberate exception:** `assets/pig-payment.png` — the payment-screen pig illustration is a raster screenshot of a hand drawing pasted into Figma, no vector source exists. User explicitly approved embedding it as `<img>` rather than tracing it. Revisit if a vector version ever becomes available.

## Testing Notes

- Local `npx serve` cannot run the `api/*.js` serverless functions — those only work once deployed to Vercel. Test them live via `curl` against `https://cashless-schweindl.vercel.app/api/...` (no password needed, see middleware note above).
- Local `serve` also doesn't reliably apply the `/jar/:id` rewrites from `serve.json` when run from the parent multi-project directory — load `index.html` directly and drive state via `db.ref(...)` in the console, or run `serve` rooted in this directory specifically.
- Firebase Realtime Database rules are currently in **test mode** (open read/write, expires ~30 days after project creation) — fine for active development, but must be locked down with proper security rules before any real money/production use.

## Open TODOs

- **Remove "Einträge löschen" from Settings before launch.** Left in deliberately for testing (deletes a jar's tap history, leaves `total` untouched) — user explicitly asked to be reminded to take it out before going live.
- Auto-billing only runs when someone has a jar's dashboard open (piggybacks on the Firebase listener) — a cron job or Stripe webhook would be needed so jars nobody revisits still get billed once threshold/30 days is reached.
- Empty-state design for the transaction list (currently just a plain "Noch keine Einzahlungen" text)
- Real PayPal payout integration (currently just a text field) — or decide this is permanently out of scope in favor of Stripe
- Goal-reached state/animation + decide the follow-up user journey (trigger a payout? from where?)
- Stripe webhook for async confirmation hardening
- Sound-on-tap and proximity/push settings (mentioned as future Settings additions, not yet built)
