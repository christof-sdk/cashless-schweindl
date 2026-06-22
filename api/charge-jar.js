const { stripeRequest } = require('./_stripe');
const { getJar, patchJar } = require('./_firebase');

// Pending taps each carry the payer's own stripeCustomerId/stripePaymentMethodId
// (set on the device that made the tap). Group by payer and charge each one only
// for their own share — never cross-charge one person's card for another's taps.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { jarId } = req.body || {};
  if (!jarId) return res.status(400).json({ error: 'jarId fehlt' });

  try {
    const jar = await getJar(jarId);
    if (!jar) return res.status(404).json({ error: 'Sparschwein nicht gefunden' });

    const taps = jar.taps || {};
    const pendingEntries = Object.entries(taps).filter(([, t]) => t.status === 'pending');

    if (!pendingEntries.length) {
      return res.status(200).json({ charged: 0, message: 'Nichts offen' });
    }

    const groups = {};
    pendingEntries.forEach(([key, t]) => {
      const groupKey = `${t.stripeCustomerId || 'none'}::${t.stripePaymentMethodId || 'none'}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          customerId: t.stripeCustomerId,
          paymentMethodId: t.stripePaymentMethodId,
          sum: 0,
          tapKeys: [],
        };
      }
      groups[groupKey].sum += t.amount;
      groups[groupKey].tapKeys.push(key);
    });

    const results = [];
    for (const group of Object.values(groups)) {
      if (!group.customerId || !group.paymentMethodId) {
        results.push({ charged: 0, status: 'no_payment_method', taps: group.tapKeys.length });
        continue;
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
