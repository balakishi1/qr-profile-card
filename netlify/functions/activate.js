const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function sign(data) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(data).digest('hex');
}

async function notifyTelegram(text) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' })
    });
  } catch (e) {
    console.error('telegram error', e);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ success: false, reason: 'bad_json' }) };
  }

  const { license_key, device_id, device_info } = body;
  if (!license_key || !device_id) {
    return { statusCode: 400, body: JSON.stringify({ success: false, reason: 'missing_fields' }) };
  }

  const { data: license, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('license_key', license_key)
    .single();

  const ip = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';

  if (error || !license) {
    return { statusCode: 404, body: JSON.stringify({ success: false, reason: 'not_found' }) };
  }

  if (!license.is_active) {
    return { statusCode: 403, body: JSON.stringify({ success: false, reason: 'inactive' }) };
  }

  // İlk aktivasiya - cihazı bu lisenziyaya bağla
  if (!license.device_fingerprint) {
    await supabase
      .from('licenses')
      .update({
        device_fingerprint: device_id,
        device_info: device_info || {},
        activated_at: new Date().toISOString()
      })
      .eq('license_key', license_key);

    await supabase.from('access_attempts').insert({
      license_key,
      device_fingerprint: device_id,
      device_info,
      ip,
      allowed: true,
      note: 'first_activation'
    });

    await notifyTelegram(
      `✅ <b>Yeni aktivasiya</b>\nLisenziya: <code>${license_key}</code>\nSahib: ${license.owner_name || '-'}\nIP: ${ip}\nCihaz: ${(device_info && device_info.userAgent) || '-'}`
    );

    const token = sign(`${license_key}:${device_id}`);
    return { statusCode: 200, body: JSON.stringify({ success: true, token }) };
  }

  // Eyni cihaz - keç
  if (license.device_fingerprint === device_id) {
    const token = sign(`${license_key}:${device_id}`);
    return { statusCode: 200, body: JSON.stringify({ success: true, token }) };
  }

  // Başqa cihaz - rədd et, logla, bildiriş göndər
  await supabase.from('access_attempts').insert({
    license_key,
    device_fingerprint: device_id,
    device_info,
    ip,
    allowed: false,
    note: 'device_mismatch'
  });

  await notifyTelegram(
    `🚨 <b>İCAZƏSİZ CƏHD!</b>\nLisenziya: <code>${license_key}</code>\nSahib: ${license.owner_name || '-'}\nIP: ${ip}\nCihaz: ${(device_info && device_info.userAgent) || '-'}\nEkran: ${(device_info && device_info.screen) || '-'}\nPlatform: ${(device_info && device_info.platform) || '-'}`
  );

  return { statusCode: 403, body: JSON.stringify({ success: false, reason: 'device_mismatch' }) };
};
