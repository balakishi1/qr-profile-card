const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

exports.handler = async (event) => {
  const pass = event.headers['x-admin-password'];
  if (!process.env.ADMIN_PASSWORD || pass !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: 'unauthorized' }) };
  }

  const action = event.queryStringParameters && event.queryStringParameters.action;

  if (event.httpMethod === 'GET' && action === 'list') {
    const { data, error } = await supabase.from('licenses').select('*').order('created_at', { ascending: false });
    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, body: JSON.stringify({ licenses: data }) };
  }

  if (event.httpMethod === 'GET' && action === 'attempts') {
    const { data, error } = await supabase
      .from('access_attempts')
      .select('*')
      .order('attempted_at', { ascending: false })
      .limit(300);
    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, body: JSON.stringify({ attempts: data }) };
  }

  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: 'bad_json' }) };
    }

    if (action === 'create') {
      const license_key = (body.license_key || crypto.randomBytes(8).toString('hex')).toUpperCase();
      const profile_slug = body.profile_slug || crypto.randomBytes(6).toString('hex');
      const { data, error } = await supabase
        .from('licenses')
        .insert({
          license_key,
          owner_name: body.owner_name || '',
          is_active: true,
          profile_slug,
          profile_data: body.profile_data || { bio: '', links: [] }
        })
        .select()
        .single();
      if (error) return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
      return { statusCode: 200, body: JSON.stringify({ license: data }) };
    }

    if (action === 'revoke') {
      await supabase.from('licenses').update({ is_active: false }).eq('license_key', body.license_key);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    if (action === 'activate') {
      await supabase.from('licenses').update({ is_active: true }).eq('license_key', body.license_key);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    if (action === 'reset_device') {
      await supabase
        .from('licenses')
        .update({ device_fingerprint: null, device_info: null, activated_at: null })
        .eq('license_key', body.license_key);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    if (action === 'delete') {
      await supabase.from('licenses').delete().eq('license_key', body.license_key);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'unknown_action' }) };
  }

  return { statusCode: 400, body: JSON.stringify({ error: 'unknown_action' }) };
};
