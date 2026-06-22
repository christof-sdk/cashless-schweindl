const { stripeRequest } = require('./_stripe');

// Creates a Stripe Customer + SetupIntent for whichever device/browser calls this.
// Not tied to a jar — the resulting customerId/paymentMethodId is stored client-side
// (localStorage) so each person pays with their own card, regardless of which jar
// they tap into.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const customer = await stripeRequest('customers', {
      description: 'Cashless Schweindl Zahler',
    });

    const setupIntent = await stripeRequest('setup_intents', {
      customer: customer.id,
      payment_method_types: ['card'],
    });

    res.status(200).json({ clientSecret: setupIntent.client_secret, customerId: customer.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
