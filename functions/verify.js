const { createClient } = require('@supabase/supabase-js');
const { sign, isDeviceAuthorized } = require('./lib/deviceAuth');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ valid: false }) };
  }

  const { license_key, device_id, token } = body;
  if (!license_key || !device_id || !token) {
    return { statusCode: 400, body: JSON.stringify({ valid: false }) };
  }

  const expected = sign(`${license_key}:${device_id}`);
  if (expected !== token) {
    return { statusCode: 403, body: JSON.stringify({ valid: false, reason: 'bad_token' }) };
  }

  const { ok, license } = await isDeviceAuthorized(supabase, license_key, device_id);
  if (!ok) {
    return { statusCode: 403, body: JSON.stringify({ valid: false, reason: 'revoked' }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      valid: true,
      owner_name: license.owner_name,
      profile_slug: license.profile_slug,
      profile_data: license.profile_data || {}
    })
  };
};
