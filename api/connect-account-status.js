const { stripeRequest } = require('./_stripe');

// Read-only status check for a jar's linked Stripe Connect account. accountId isn't
// secret in the sense payment-method-info.js's paymentMethodId was — this only ever
// returns three booleans, never card/PII data — and it already lives in the openly
// readable `jars/*` tree, consistent with this project's no-per-jar-auth posture.
module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { accountId } = req.query || {};
  if (!accountId) return res.status(400).json({ error: 'accountId fehlt' });
  if (!/^acct_[A-Za-z0-9]+$/.test(accountId)) {
    return res.status(400).json({ error: 'Ungültige accountId' });
  }

  try {
    const account = await stripeRequest(`accounts/${accountId}`, {}, 'GET');
    res.status(200).json({
      chargesEnabled: !!account.charges_enabled,
      payoutsEnabled: !!account.payouts_enabled,
      detailsSubmitted: !!account.details_submitted,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
