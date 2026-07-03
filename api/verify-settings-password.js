const crypto = require('crypto');
const { getPrivileged } = require('./_firebase');
const { checkRateLimit, clientIp } = require('./_rateLimit');

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32;

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 10; // password attempts per IP per window — generous for typos,
// tight enough to make online brute-forcing the settings password impractical.

// Checks a jar's settings password against the hash in settingsAuth/{jarId} (set
// directly by the owner device via the DB rules — see database.rules.json — never
// through this endpoint). The hash/salt never leave the server; this only ever
// returns true/false. settingsAuth has no client-facing .read rule at all, so this
// privileged (database-secret) read is the only way to reach it, by design.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { jarId, password } = req.body || {};
  if (!jarId || !password) return res.status(400).json({ error: 'jarId oder password fehlt' });
  // Validate jarId to prevent path traversal into other Firebase nodes via the
  // privileged (database-secret) read below.
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(jarId)) {
    return res.status(400).json({ error: 'Ungültige jarId' });
  }

  try {
    const allowed = await checkRateLimit('verifySettingsPassword', clientIp(req), {
      windowMs: RATE_LIMIT_WINDOW_MS,
      max: RATE_LIMIT_MAX,
    });
    if (!allowed) {
      return res.status(429).json({ error: 'Zu viele Versuche. Bitte später erneut versuchen.' });
    }

    const auth = await getPrivileged(`settingsAuth/${jarId}`);
    if (!auth?.hash || !auth?.salt) {
      return res.status(200).json({ valid: false, notConfigured: true });
    }

    const computed = crypto
      .pbkdf2Sync(password, Buffer.from(auth.salt, 'hex'), PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256')
      .toString('hex');

    const a = Buffer.from(computed, 'hex');
    const b = Buffer.from(auth.hash, 'hex');
    const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

    res.status(200).json({ valid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
