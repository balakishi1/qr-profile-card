const { sign, isDeviceAuthorized } = require('./deviceAuth');

// Mövcud aktivasiya (license_key + device_id + token) sxemini bütün yeni
// sosial funksiyalarda (dostluq, mesajlaşma) təkrar istifadə edir.
// Uğurlu olarsa license sətrini qaytarır (profile_slug daxil olmaqla).
async function requireAuth(supabase, body) {
  const { license_key, device_id, token } = body || {};
  if (!license_key || !device_id || !token) {
    return { ok: false, statusCode: 400, reason: 'missing_params' };
  }
  const expected = sign(`${license_key}:${device_id}`);
  if (expected !== token) {
    return { ok: false, statusCode: 403, reason: 'bad_token' };
  }
  const { ok, license } = await isDeviceAuthorized(supabase, license_key, device_id);
  if (!ok || !license) {
    return { ok: false, statusCode: 403, reason: 'revoked' };
  }
  if (!license.profile_slug) {
    return { ok: false, statusCode: 409, reason: 'no_slug' };
  }
  return { ok: true, license };
}

module.exports = { requireAuth };
