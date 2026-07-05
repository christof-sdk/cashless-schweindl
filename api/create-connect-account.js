const { stripeRequest } = require('./_stripe');
const { checkRateLimit, clientIp } = require('./_rateLimit');

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 20; // same generous per-IP ceiling as setup-intent.js

// Test-mode defaults for a household jar's payout account — a private person,
// not a company. Easy-to-change constants, not user-configurable in this pass.
const ACCOUNT_COUNTRY = 'AT';
const ACCOUNT_BUSINESS_TYPE = 'individual';

// Creates (or, given an existing accountId, reuses) a Stripe Connect account for a
// jar's payout link, then always returns a fresh Account Session client_secret for
// the embedded onboarding component. Reusing the accountId on repeat calls keeps
// this idempotent — re-entering onboarding or reopening the Settings drawer's
// Auszahlungs-Konto page must never create a second Stripe account for the same jar.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const allowed = await checkRateLimit('connectAccount', clientIp(req), {
      windowMs: RATE_LIMIT_WINDOW_MS,
      max: RATE_LIMIT_MAX,
    });
    if (!allowed) {
      return res.status(429).json({ error: 'Zu viele Anfragen. Bitte später erneut versuchen.' });
    }

    const { accountId, jarId } = req.body || {};
    let account;
    if (accountId) {
      if (!/^acct_[A-Za-z0-9]+$/.test(accountId)) {
        return res.status(400).json({ error: 'Ungültige accountId' });
      }
      account = await stripeRequest(`accounts/${accountId}`, {}, 'GET');
    } else {
      if (!jarId || !/^[a-zA-Z0-9_-]{1,64}$/.test(jarId)) {
        return res.status(400).json({ error: 'jarId fehlt oder ungültig' });
      }
      account = await stripeRequest('accounts', {
        country: ACCOUNT_COUNTRY,
        business_type: ACCOUNT_BUSINESS_TYPE,
        controller: {
          fees: { payer: 'application' },
          // Stripe (not the platform) must bear loss/chargeback liability whenever
          // stripe_dashboard.type is 'none' and Stripe collects requirements via its
          // own embedded onboarding component — confirmed via a live 400 from Stripe
          // ("Stripe must be liable for negative balances or refunds and chargebacks").
          losses: { payments: 'stripe' },
          stripe_dashboard: { type: 'none' },
        },
        // This account only ever needs to receive payouts (charge-jar.js still
        // charges the platform account for now, see CLAUDE.md's Per-Owner Payouts
        // section) — `transfers` is the capability that lets Stripe pay out to it.
        capabilities: { transfers: { requested: true } },
        metadata: { jarId },
      });
    }

    const accountSession = await stripeRequest('account_sessions', {
      account: account.id,
      components: { account_onboarding: { enabled: true } },
    });

    res.status(200).json({ accountId: account.id, clientSecret: accountSession.client_secret });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
