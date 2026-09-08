const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { sign, isDeviceAuthorized } = require('./lib/deviceAuth');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ success: false }) };
  }

  const { license_key, device_id, token, filename } = body;
  if (!license_key || !device_id || !token) {
    return { statusCode: 400, body: JSON.stringify({ success: false }) };
  }

  const expected = sign(`${license_key}:${device_id}`);
  if (expected !== token) {
    return { statusCode: 403, body: JSON.stringify({ success: false, reason: 'bad_token' }) };
  }

  const { ok } = await isDeviceAuthorized(supabase, license_key, device_id);
  if (!ok) {
    return { statusCode: 403, body: JSON.stringify({ success: false, reason: 'revoked' }) };
  }

  const safeName = (filename || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${license_key}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${safeName}`;

  const { data, error: upErr } = await supabase.storage.from('media').createSignedUploadUrl(path);
  if (upErr) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: upErr.message }) };
  }

  const { data: pub } = supabase.storage.from('media').getPublicUrl(path);

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      path,
      token: data.token,
      publicUrl: pub.publicUrl
    })
  };
};
