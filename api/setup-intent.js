const { stripeRequest } = require('./_stripe');
const { getJar, patchJar } = require('./_firebase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { jarId } = req.body || {};
  if (!jarId) return res.status(400).json({ error: 'jarId fehlt' });

  try {
    const jar = await getJar(jarId);
    if (!jar) return res.status(404).json({ error: 'Sparschwein nicht gefunden' });

    let customerId = jar.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeRequest('customers', {
        description: `Cashless Schweindl: ${jar.name || jarId}`,
        metadata: { jarId },
      });
      customerId = customer.id;
      await patchJar(jarId, { stripeCustomerId: customerId });
    }

    const setupIntent = await stripeRequest('setup_intents', {
      customer: customerId,
      payment_method_types: ['card'],
    });

    res.status(200).json({ clientSecret: setupIntent.client_secret });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
