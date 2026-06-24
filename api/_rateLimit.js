const crypto = require('crypto');
const { getPrivileged, setPrivileged } = require('./_firebase');

// Coarse fixed-window rate limit, keyed by hashed client IP, stored in Firebase
// under rateLimits/{bucket}/{ipHash}/{windowKey} (no client rule grants access to
// this path, so it's effectively server-only). Good enough to blunt scripted abuse
// of an endpoint that creates real Stripe resources — not meant to be exact under
// concurrent requests (a lost increment just means a slightly looser limit).
async function checkRateLimit(bucket, ip, { windowMs, max }) {
  const ipHash = crypto.createHash('sha256').update(ip || 'unknown').digest('hex');
  const windowKey = Math.floor(Date.now() / windowMs);
  const path = `rateLimits/${bucket}/${ipHash}/${windowKey}`;
  const current = (await getPrivileged(path)) || 0;
  if (current >= max) return false;
  await setPrivileged(path, current + 1);
  return true;
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

module.exports = { checkRateLimit, clientIp };
