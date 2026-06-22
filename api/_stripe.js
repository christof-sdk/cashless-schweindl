// Minimal Stripe REST client — no npm dependency, calls api.stripe.com directly via fetch.
const STRIPE_API = 'https://api.stripe.com/v1';

function toFormParams(obj, prefix = '') {
  const params = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((v) => params.push([`${fullKey}[]`, v]));
    } else if (typeof value === 'object') {
      params.push(...toFormParams(value, fullKey));
    } else {
      params.push([fullKey, value]);
    }
  }
  return params;
}

async function stripeRequest(path, params = {}) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY ist nicht gesetzt');

  const body = new URLSearchParams(toFormParams(params)).toString();
  const res = await fetch(`${STRIPE_API}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error?.message || 'Stripe-Anfrage fehlgeschlagen');
    err.stripeError = data.error;
    throw err;
  }
  return data;
}

module.exports = { stripeRequest };
