const crypto = require('crypto');

function sign(data) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(data).digest('hex');
}

// Cihazın bu lisenziyaya bağlı olub-olmadığını yoxlayır (çox-cihaz dəstəyi)
async function isDeviceAuthorized(supabase, license_key, device_id) {
  const { data: license, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('license_key', license_key)
    .single();

  if (error || !license || !license.is_active) return { ok: false, license: null };

  const { data: device } = await supabase
    .from('license_devices')
    .select('id')
    .eq('license_key', license_key)
    .eq('device_fingerprint', device_id)
    .maybeSingle();

  if (!device) return { ok: false, license };
  return { ok: true, license };
}

module.exports = { sign, isDeviceAuthorized };
