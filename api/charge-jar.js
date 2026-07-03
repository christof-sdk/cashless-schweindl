const { stripeRequest } = require('./_stripe');
const { getJar, patchJar, getPayerProfile } = require('./_firebase');

const MAX_PENDING_AGE_DAYS = 30;
const MAX_TAP_AMOUNT = 20; // matches the UI clamp in index.html — guards against forged Firebase writes
// Circuit breaker: Firebase write rules are currently open (test mode), so a forged tap
// could in principle attach an arbitrary payer's real stripeCustomerId/paymentMethodId.
// This caps the blast radius of any single charge-jar run until DB rules lock writes down.
const MAX_CHARGE_PER_GROUP = 500;

// Pending taps carry the payer's payerUid (their Firebase Anonymous Auth uid) — the
// DB rules guarantee a tap can only claim the uid of whoever actually wrote it, so a
// forged tap can no longer attach a stranger's Stripe identity. The uid resolves to
// the real stripeCustomerId/paymentMethodId via payerProfiles/{uid}, which only that
// uid can read/write client-side; the server reads it here with the database secret.
// (Older taps written before this migration may still carry the raw
// stripeCustomerId/stripePaymentMethodId fields directly — honored as a fallback so
// already-pending money from before the cutover still gets billed correctly.)
// Group by payer and charge each one only for their own share — never cross-charge
// one person's card for another's taps.
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
  // Validate jarId to prevent path traversal — charge-jar uses patchJar which writes
  // with the public Firebase client (no secret), but defense in depth here is cheap.
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(jarId)) {
    return res.status(400).json({ error: 'Ungültige jarId' });
  }

  try {
    const jar = await getJar(jarId);
    if (!jar) return res.status(404).json({ error: 'Sparschwein nicht gefunden' });

    const taps = jar.taps || {};
    const pendingEntries = Object.entries(taps).filter(([, t]) => t.status === 'pending');

    if (!pendingEntries.length) {
      return res.status(200).json({ charged: 0, message: 'Nichts offen' });
    }

    const threshold = jar.payoutThreshold || 15;

    // Resolve each pending tap's payerUid to its real Stripe identity once per uid.
    const profileCache = {};
    async function resolvePayer(t) {
      if (t.payerUid) {
        if (!(t.payerUid in profileCache)) {
          profileCache[t.payerUid] = await getPayerProfile(t.payerUid).catch(() => null);
        }
        const profile = profileCache[t.payerUid];
        return { customerId: profile?.customerId, paymentMethodId: profile?.paymentMethodId };
      }
      // Legacy fallback for taps written before the payerUid migration.
      return { customerId: t.stripeCustomerId, paymentMethodId: t.stripePaymentMethodId };
    }

    const groups = {};
    const rejected = [];
    for (const [key, t] of pendingEntries) {
      // A forged/corrupted tap (bad Firebase write, or — until DB rules lock writes
      // down — a malicious one) must never be allowed to inflate a real charge.
      const amount = Number(t.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_TAP_AMOUNT) {
        rejected.push(key);
        continue;
      }
      const { customerId, paymentMethodId } = await resolvePayer(t);
      const groupKey = `${customerId || 'none'}::${paymentMethodId || 'none'}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          customerId,
          paymentMethodId,
          sum: 0,
          tapKeys: [],
          oldestTimestamp: t.timestamp,
        };
      }
      groups[groupKey].sum += amount;
      groups[groupKey].tapKeys.push(key);
      groups[groupKey].oldestTimestamp = Math.min(groups[groupKey].oldestTimestamp, t.timestamp);
    }

    const results = [];
    if (rejected.length) {
      results.push({ charged: 0, status: 'rejected_invalid_amount', taps: rejected.length });
    }

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

      if (group.sum > MAX_CHARGE_PER_GROUP) {
        results.push({ charged: 0, status: 'exceeds_safety_cap', pending: group.sum });
        continue;
      }

      // Claim these taps ('charging') before calling Stripe, and only ever charge taps
      // still 'pending' at claim time. Closes the race window where two concurrent
      // charge-jar runs (e.g. two open dashboards) could both read the same pending
      // taps and double-charge before either finishes.
      const claimUpdates = {};
      group.tapKeys.forEach((key) => { claimUpdates[`taps/${key}/status`] = 'charging'; });
      await patchJar(jarId, claimUpdates);

      try {
        const paymentIntent = await stripeRequest('payment_intents', {
          amount: Math.round(group.sum * 100),
          currency: 'eur',
          customer: group.customerId,
          payment_method: group.paymentMethodId,
          off_session: true,
          confirm: true,
          description: `Cashless Schweindl Abrechnung: ${jar.name || jarId}`,
          metadata: { jarId, tapKeys: group.tapKeys.join(',') },
        });

        if (paymentIntent.status === 'succeeded') {
          const updates = {};
          group.tapKeys.forEach((key) => { updates[`taps/${key}/status`] = 'confirmed'; });
          await patchJar(jarId, updates);
          results.push({ charged: group.sum, status: 'succeeded' });
        } else if (paymentIntent.status === 'processing') {
          // Not yet final — leave taps 'charging' rather than reverting to 'pending',
          // otherwise the next auto-charge run could fire a second PaymentIntent for
          // the same money while this one is still in flight. The webhook resolves
          // these to 'confirmed' or back to 'pending' once Stripe reports the outcome.
          results.push({ charged: 0, status: 'processing' });
        } else {
          const revert = {};
          group.tapKeys.forEach((key) => { revert[`taps/${key}/status`] = 'pending'; });
          await patchJar(jarId, revert);
          results.push({ charged: 0, status: paymentIntent.status });
        }
      } catch (e) {
        const revert = {};
        group.tapKeys.forEach((key) => { revert[`taps/${key}/status`] = 'pending'; });
        await patchJar(jarId, revert);
        results.push({ charged: 0, status: 'failed', error: e.message });
      }
    }

    const charged = results.reduce((acc, r) => acc + r.charged, 0);
    res.status(200).json({ charged, results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
