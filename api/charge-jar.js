const { stripeRequest } = require('./_stripe');
const { getJar, patchJar } = require('./_firebase');

const MAX_PENDING_AGE_DAYS = 30;

// Pending taps each carry the payer's own stripeCustomerId/stripePaymentMethodId
// (set on the device that made the tap). Group by payer and charge each one only
// for their own share — never cross-charge one person's card for another's taps.
//
// Auto mode (force=false): a payer's group is only charged once THEIR own
// pending sum reaches the jar's payoutThreshold, or their oldest pending tap
// is older than MAX_PENDING_AGE_DAYS — whichever comes first. Threshold is
// per-payer (not jar-wide) since Stripe fees are per transaction, not per jar.
// Manual mode (force=true, "Jetzt abrechnen"): charges every payer's pending
// sum immediately, ignoring threshold/age.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { jarId, force } = req.body || {};
  if (!jarId) return res.status(400).json({ error: 'jarId fehlt' });

  try {
    const jar = await getJar(jarId);
    if (!jar) return res.status(404).json({ error: 'Sparschwein nicht gefunden' });

    const taps = jar.taps || {};
    const pendingEntries = Object.entries(taps).filter(([, t]) => t.status === 'pending');

    if (!pendingEntries.length) {
      return res.status(200).json({ charged: 0, message: 'Nichts offen' });
    }

    const threshold = jar.payoutThreshold || 15;
    const groups = {};
    pendingEntries.forEach(([key, t]) => {
      const groupKey = `${t.stripeCustomerId || 'none'}::${t.stripePaymentMethodId || 'none'}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          customerId: t.stripeCustomerId,
          paymentMethodId: t.stripePaymentMethodId,
          sum: 0,
          tapKeys: [],
          oldestTimestamp: t.timestamp,
        };
      }
      groups[groupKey].sum += t.amount;
      groups[groupKey].tapKeys.push(key);
      groups[groupKey].oldestTimestamp = Math.min(groups[groupKey].oldestTimestamp, t.timestamp);
    });

    const results = [];
    for (const group of Object.values(groups)) {
      if (!group.customerId || !group.paymentMethodId) {
        results.push({ charged: 0, status: 'no_payment_method', taps: group.tapKeys.length });
        continue;
      }

      if (!force) {
        const ageDays = (Date.now() - group.oldestTimestamp) / 86400000;
        const meetsThreshold = group.sum >= threshold;
        const meetsAge = ageDays >= MAX_PENDING_AGE_DAYS;
        if (!meetsThreshold && !meetsAge) {
          results.push({ charged: 0, status: 'below_threshold', pending: group.sum, ageDays: Math.floor(ageDays) });
          continue;
        }
      }

      try {
        const paymentIntent = await stripeRequest('payment_intents', {
          amount: Math.round(group.sum * 100),
          currency: 'eur',
          customer: group.customerId,
          payment_method: group.paymentMethodId,
          off_session: true,
          confirm: true,
          description: `Cashless Schweindl Abrechnung: ${jar.name || jarId}`,
        });

        if (paymentIntent.status === 'succeeded') {
          const updates = {};
          group.tapKeys.forEach((key) => { updates[`taps/${key}/status`] = 'confirmed'; });
          await patchJar(jarId, updates);
          results.push({ charged: group.sum, status: 'succeeded' });
        } else {
          results.push({ charged: 0, status: paymentIntent.status });
        }
      } catch (e) {
        results.push({ charged: 0, status: 'failed', error: e.message });
      }
    }

    const charged = results.reduce((acc, r) => acc + r.charged, 0);
    res.status(200).json({ charged, results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
