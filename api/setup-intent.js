const { stripeRequest } = require('./_stripe');
const { checkRateLimit, clientIp } = require('./_rateLimit');

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 20; // new Stripe customers per IP per hour — generous enough that
// several guests on the same household/event WiFi (shared public IP) can all set up a
// card within the same hour without tripping it, while still blocking scripted abuse.

// Creates a Stripe Customer + SetupIntent for whichever device/browser calls this.
// Not tied to a jar — the resulting customerId/paymentMethodId is stored client-side
// (localStorage) so each person pays with their own card, regardless of which jar
// they tap into. Rate-limited per IP since this is a public, unauthenticated endpoint
// that creates real (if free) Stripe resources — without a limit it's an easy target
// for scripted abuse.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const allowed = await checkRateLimit('setupIntent', clientIp(req), {
      windowMs: RATE_LIMIT_WINDOW_MS,
      max: RATE_LIMIT_MAX,
    });
    if (!allowed) {
      return res.status(429).json({ error: 'Zu viele Anfragen. Bitte später erneut versuchen.' });
    }

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
