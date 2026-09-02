// Google Identity Services-dən gələn id_token-i yoxlayır.
// Server-side secret tələb olunmur — Google-un öz tokeninfo endpoint-i istifadə olunur.
// GOOGLE_CLIENT_ID env dəyişəni verilibsə, "aud" (audience) də yoxlanılır ki, başqa saytın
// tokeni qəbul edilməsin.
async function verifyGoogleToken(idToken) {
  if (!idToken || typeof idToken !== 'string') return null;
  try {
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!r.ok) return null;
    const j = await r.json();
    if (!j || !j.sub || !j.email) return null;
    if (j.email_verified !== 'true' && j.email_verified !== true) return null;
    if (process.env.GOOGLE_CLIENT_ID && j.aud !== process.env.GOOGLE_CLIENT_ID) return null;
    return { sub: j.sub, email: String(j.email).toLowerCase(), name: j.name || '', picture: j.picture || '' };
  } catch (e) {
    console.error('verifyGoogleToken error', e);
    return null;
  }
}

module.exports = { verifyGoogleToken };
