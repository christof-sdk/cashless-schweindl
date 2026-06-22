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

module.exports = { getJar, patchJar };
