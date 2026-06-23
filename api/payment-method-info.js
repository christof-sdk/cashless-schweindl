const { stripeRequest } = require('./_stripe');

// Returns the card brand + last4 for a saved payment method, so the client
// can display "Visa •••• 4242" without ever touching raw card data.
module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query || {};
  if (!id) return res.status(400).json({ error: 'id fehlt' });

  try {
    const pm = await stripeRequest(`payment_methods/${id}`, {}, 'GET');
    res.status(200).json({ brand: pm.card?.brand || null, last4: pm.card?.last4 || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
