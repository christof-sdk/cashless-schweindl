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

**Critical architecture decision:** the saved card belongs to the **device/browser that taps**, not to the jar. Each payer's `stripeCustomerId`/`stripePaymentMethodId` lives in that device's `localStorage` (`payerCustomerId`, `payerPaymentMethodId`), never on `/jars/{id}`. The reasoning: anyone can tap any jar's NFC tag, and if the card were stored on the jar, every tapper would silently charge the jar owner's card. Each tap embeds its own payer's Stripe IDs.

- First tap on a new device shows a one-time card-capture gate on the payment screen (`#pay-card-gate`, Stripe Elements + SetupIntent). After that, swiping is frictionless on that device for any jar.
- Taps write `status: 'pending'` when the device has a saved payment method, otherwise `status: 'confirmed'` immediately (no real money moves — this preserves the original fake-payment prototype behavior for anyone who hasn't set up a card).
- `total` on the jar updates optimistically on every tap regardless of pending/confirmed status.
- `/api/charge-jar` groups a jar's pending taps **by payer** and creates one PaymentIntent per payer — never cross-charges one person's card for another's taps. Verified live with two distinct Stripe test customers in the same jar.
- Trigger logic (per payer, not jar-wide, since Stripe fees are per-transaction): a payer is auto-charged once **their own** pending sum reaches `payoutThreshold` (jar setting, default €15) **or** their oldest pending tap turns 30 days old — whichever comes first. The dashboard's Firebase listener pings `/api/charge-jar` after every change; the server decides per payer whether to actually charge.
- Manual "Jetzt abrechnen" button in Settings sends `{jarId, force: true}` — charges every payer's pending sum immediately, ignoring threshold/age.
- No Stripe webhook yet — confirmation is synchronous, read directly from the PaymentIntent response. A webhook would be needed for async edge cases (e.g. 3D Secure retries); deliberately deferred.
- `middleware.js` excludes `api/` from the Basic Auth gate so these endpoints (and any future webhook) are reachable without the site password.

## Asset Conventions

- Icons/illustrations: inline SVG, always — see parent repo's `CLAUDE.md` for the general rule (strip Figma background rects / page-context wrappers, keep only the meaningful path).
- **One deliberate exception:** `assets/pig-payment.png` — the payment-screen pig illustration is a raster screenshot of a hand drawing pasted into Figma, no vector source exists. User explicitly approved embedding it as `<img>` rather than tracing it. Revisit if a vector version ever becomes available.

## Testing Notes

- Local `npx serve` cannot run the `api/*.js` serverless functions — those only work once deployed to Vercel. Test them live via `curl` against `https://cashless-schweindl.vercel.app/api/...` (no password needed, see middleware note above).
- Local `serve` also doesn't reliably apply the `/jar/:id` rewrites from `serve.json` when run from the parent multi-project directory — load `index.html` directly and drive state via `db.ref(...)` in the console, or run `serve` rooted in this directory specifically.
- Firebase Realtime Database rules are currently in **test mode** (open read/write, expires ~30 days after project creation) — fine for active development, but must be locked down with proper security rules before any real money/production use.

## Open TODOs

- **Remove "Einträge löschen" from Settings before launch.** Left in deliberately for testing (deletes a jar's tap history, leaves `total` untouched) — user explicitly asked to be reminded to take it out before going live.
- Empty-state design for the transaction list (currently just a plain "Noch keine Einzahlungen" text)
- Real PayPal payout integration (currently just a text field) — or decide this is permanently out of scope in favor of Stripe
- Goal-reached state/animation + decide the follow-up user journey (trigger a payout? from where?)
- Stripe webhook for async confirmation hardening
- Sound-on-tap and proximity/push settings (mentioned as future Settings additions, not yet built)
