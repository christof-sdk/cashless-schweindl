const crypto = require('crypto');
const { getJar, patchJar } = require('./_firebase');

// Vercel's request.body helper is a lazy getter — it's only parsed if something
// reads request.body. As long as this handler never touches that property, the
// underlying stream is untouched and safe to read raw here, byte-for-byte, which
// is required for Stripe's signature check (computed over the raw payload).
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// Manual implementation of Stripe's webhook signature scheme (HMAC-SHA256 over
// "{timestamp}.{rawBody}") — avoids pulling in the stripe npm package for this one
// check, consistent with the rest of api/ calling the Stripe REST API directly.
const WEBHOOK_TOLERANCE_SECONDS = 300;

function isValidSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => part.split('='))
  );
  if (!parts.t || !parts.v1) return false;

  // Reject webhooks older than 5 minutes to prevent replay attacks.
  const timestamp = parseInt(parts.t, 10);
  if (Math.abs(Date.now() / 1000 - timestamp) > WEBHOOK_TOLERANCE_SECONDS) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${parts.t}.${rawBody}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(parts.v1);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

// Reconciles taps left in 'charging' after an async PaymentIntent outcome — the
// synchronous response in charge-jar.js handles the common case, this is the
// safety net for delayed confirmation (e.g. status was 'processing') or for a
// charge-jar run that crashed/timed out between creating the intent and patching
// tap status.
async function reconcile(jarId, tapKeysCsv, targetStatus, onlyIfCurrentlyCharging) {
  const tapKeys = (tapKeysCsv || '').split(',').filter(Boolean);
  if (!tapKeys.length) return;

  const jar = await getJar(jarId);
  if (!jar || !jar.taps) return;

  const updates = {};
  tapKeys.forEach((key) => {
    const tap = jar.taps[key];
    if (!tap) return;
    if (onlyIfCurrentlyCharging && tap.status !== 'charging') return;
    updates[`taps/${key}/status`] = targetStatus;
  });
  if (Object.keys(updates).length) {
    await patchJar(jarId, updates);
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: 'STRIPE_WEBHOOK_SECRET ist nicht gesetzt' });

  const rawBody = await readRawBody(req);
  if (!isValidSignature(rawBody, req.headers['stripe-signature'], secret)) {
    return res.status(400).json({ error: 'Ungültige Signatur' });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    return res.status(400).json({ error: 'Ungültiger Payload' });
  }

  try {
    const intent = event.data?.object;
    const { jarId, tapKeys } = intent?.metadata || {};

    if (jarId && tapKeys) {
      if (event.type === 'payment_intent.succeeded') {
        await reconcile(jarId, tapKeys, 'confirmed', false);
      } else if (event.type === 'payment_intent.payment_failed' || event.type === 'payment_intent.canceled') {
        await reconcile(jarId, tapKeys, 'pending', true);
      }
    }
    res.status(200).json({ received: true });
  } catch (e) {
    // Acknowledge anyway — Stripe retries on non-2xx, and a transient Firebase error
    // here shouldn't cause Stripe to keep hammering this endpoint with retries.
    console.error('Webhook-Verarbeitung fehlgeschlagen:', e);
    res.status(200).json({ received: true });
  }
}

module.exports = handler;
