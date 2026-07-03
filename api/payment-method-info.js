const { stripeRequest } = require('./_stripe');
const { getPayerProfile } = require('./_firebase');

// Returns the card brand + last4 for the CALLER's own saved payment method, so the
// client can display "Visa •••• 4242" without ever touching raw card data. The
// paymentMethodId is resolved server-side from payerProfiles/{uid} — never accepted
// directly from the client — since a raw id could have been read from an older,
// pre-migration tap that still carries another payer's Stripe IDs in the open
// `jars` tree. payerProfiles/{uid} is itself locked to that uid by the DB rules, so
// this only ever returns the calling device's own card.
module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { uid } = req.query || {};
  if (!uid) return res.status(400).json({ error: 'uid fehlt' });
  // Validate uid format to prevent path traversal — Firebase Anonymous Auth uids are
  // 20–40 alphanumeric chars; anything else (slashes, dots) must be rejected before
  // the uid is interpolated into the privileged Firebase path.
  if (!/^[a-zA-Z0-9]{20,40}$/.test(uid)) {
    return res.status(400).json({ error: 'Ungültige uid' });
  }

  try {
    const profile = await getPayerProfile(uid);
    if (!profile?.paymentMethodId) {
      return res.status(404).json({ error: 'Kein Zahlungsmittel für dieses Gerät gefunden' });
    }
    const pm = await stripeRequest(`payment_methods/${profile.paymentMethodId}`, {}, 'GET');
    res.status(200).json({ brand: pm.card?.brand || null, last4: pm.card?.last4 || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
