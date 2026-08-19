const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function sign(data) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(data).digest('hex');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ success: false }) };
  }

  const { license_key, device_id, token, path } = body;
  if (!license_key || !device_id || !token || !path) {
    return { statusCode: 400, body: JSON.stringify({ success: false }) };
  }

  const expected = sign(`${license_key}:${device_id}`);
  if (expected !== token) {
    return { statusCode: 403, body: JSON.stringify({ success: false }) };
  }

  // Faylın yolu öz lisenziya açarının qovluğunda olmalıdır (başqasının faylını silə bilməsin)
  if (!path.startsWith(`${license_key}/`)) {
    return { statusCode: 403, body: JSON.stringify({ success: false, reason: 'forbidden_path' }) };
  }

  const { data: license, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('license_key', license_key)
    .single();

  if (error || !license || !license.is_active || license.device_fingerprint !== device_id) {
    return { statusCode: 403, body: JSON.stringify({ success: false, reason: 'revoked' }) };
  }

  await supabase.storage.from('media').remove([path]);

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
