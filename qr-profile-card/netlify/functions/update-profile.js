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

  const { license_key, device_id, token, profile_data, owner_name } = body;
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

  const update = {};
  if (profile_data !== undefined) update.profile_data = profile_data;
  if (owner_name !== undefined) update.owner_name = owner_name;

  await supabase.from('licenses').update(update).eq('license_key', license_key);

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
