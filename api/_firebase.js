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

// payerProfiles/{uid} is locked down to auth.uid === $uid in the DB rules, so reading
// it from the server (which has no Firebase Auth session) requires the database secret
// to bypass rules — this is the one place server code needs elevated access.
async function getPayerProfile(uid) {
  const secret = process.env.FIREBASE_DATABASE_SECRET;
  if (!secret) throw new Error('FIREBASE_DATABASE_SECRET ist nicht gesetzt');
  const res = await fetch(`${FIREBASE_URL}/payerProfiles/${uid}.json?auth=${secret}`);
  return res.json();
}

module.exports = { getJar, patchJar, getPayerProfile };
