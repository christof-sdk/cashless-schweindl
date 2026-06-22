const { stripeRequest } = require('./_stripe');
const { getJar, patchJar } = require('./_firebase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { jarId } = req.body || {};
  if (!jarId) return res.status(400).json({ error: 'jarId fehlt' });

  try {
    const jar = await getJar(jarId);
    if (!jar) return res.status(404).json({ error: 'Sparschwein nicht gefunden' });
    if (!jar.stripeCustomerId || !jar.stripePaymentMethodId) {
      return res.status(400).json({ error: 'Kein Zahlungsmittel hinterlegt' });
    }

    const taps = jar.taps || {};
    const pendingEntries = Object.entries(taps).filter(([, t]) => t.status === 'pending');
    const sum = pendingEntries.reduce((acc, [, t]) => acc + t.amount, 0);

    if (sum <= 0) {
      return res.status(200).json({ charged: 0, message: 'Nichts offen' });
    }

    const paymentIntent = await stripeRequest('payment_intents', {
      amount: Math.round(sum * 100),
      currency: 'eur',
      customer: jar.stripeCustomerId,
      payment_method: jar.stripePaymentMethodId,
      off_session: true,
      confirm: true,
      description: `Cashless Schweindl Abrechnung: ${jar.name || jarId}`,
    });

    if (paymentIntent.status === 'succeeded') {
      const updates = {};
      pendingEntries.forEach(([key]) => {
        updates[`taps/${key}/status`] = 'confirmed';
      });
      await patchJar(jarId, updates);
      return res.status(200).json({ charged: sum, status: 'succeeded' });
    }

    return res.status(200).json({ charged: 0, status: paymentIntent.status, message: 'Zahlung nicht abgeschlossen' });
  } catch (e) {
    res.status(402).json({ error: e.message, code: e.stripeError?.decline_code || e.stripeError?.code });
  }
};
