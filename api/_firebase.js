// Minimal Firebase Realtime Database REST client for serverless functions.
const FIREBASE_URL = 'https://cashless-schweindl-default-rtdb.europe-west1.firebasedatabase.app';

async function getJar(jarId) {
  const res = await fetch(`${FIREBASE_URL}/jars/${jarId}.json`);
  return res.json();
}

async function patchJar(jarId, updates) {
  const res = await fetch(`${FIREBASE_URL}/jars/${jarId}.json`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return res.json();
}

// Generic helpers for paths locked down to server-only access in the DB rules
// (payerProfiles is restricted to auth.uid === $uid, rateLimits has no client
// rule at all) — the database secret bypasses rules entirely, so these must
// only ever be used server-side, never exposed to the client.
async function getPrivileged(path) {
  const secret = process.env.FIREBASE_DATABASE_SECRET;
  if (!secret) throw new Error('FIREBASE_DATABASE_SECRET ist nicht gesetzt');
  const res = await fetch(`${FIREBASE_URL}/${path}.json?auth=${secret}`);
  return res.json();
}

async function setPrivileged(path, data) {
  const secret = process.env.FIREBASE_DATABASE_SECRET;
  if (!secret) throw new Error('FIREBASE_DATABASE_SECRET ist nicht gesetzt');
  const res = await fetch(`${FIREBASE_URL}/${path}.json?auth=${secret}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function getPayerProfile(uid) {
  return getPrivileged(`payerProfiles/${uid}`);
}

module.exports = { getJar, patchJar, getPayerProfile, getPrivileged, setPrivileged };
