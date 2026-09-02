const { createClient } = require('@supabase/supabase-js');
const { sign } = require('./lib/deviceAuth');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function geoLookup(ip) {
  try {
    const cleanIp = (ip || '').split(',')[0].trim();
    if (!cleanIp || cleanIp === 'unknown' || cleanIp.startsWith('127.') || cleanIp.startsWith('::1')) return null;
    const r = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,regionName,city,isp,query`);
    const j = await r.json();
    if (j.status === 'success') {
      return { country: j.country, region: j.regionName, city: j.city, isp: j.isp, ip: j.query };
    }
  } catch (e) { console.error('geo lookup error', e); }
  return null;
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

  const maxDevices = license.max_devices || 1;

  // Bu cihaz artıq bağlıdırsa — birbaşa keç (geo axtarışı lazım deyil, sürətli yol)
  const { data: existingDevice } = await supabase
    .from('license_devices')
    .select('id')
    .eq('license_key', license_key)
    .eq('device_fingerprint', device_id)
    .maybeSingle();

  if (existingDevice) {
    const token = sign(`${license_key}:${device_id}`);
    return { statusCode: 200, body: JSON.stringify({ success: true, token }) };
  }

  const geo = await geoLookup(ip);
  const geoLine = geo
    ? `📍 ${geo.city || '-'}, ${geo.region || '-'}, ${geo.country || '-'}\n🌐 ${geo.isp || '-'} (${geo.ip})`
    : `IP: ${ip}`;

  // Neçə cihaz artıq bağlıdır?
  const { count } = await supabase
    .from('license_devices')
    .select('id', { count: 'exact', head: true })
    .eq('license_key', license_key);

  const currentCount = count || 0;

  if (currentCount >= maxDevices) {
    // Limit doludur - rədd et, logla, bildiriş göndər
    await supabase.from('access_attempts').insert({
      license_key, device_fingerprint: device_id, device_info, ip, allowed: false, note: 'device_limit_reached', geo
    });

    await notifyTelegram(
      `🚨 <b>İCAZƏSİZ CƏHD (cihaz limiti dolub)</b>\n` +
      `Lisenziya: <code>${license_key}</code>\n` +
      `Sahib: ${license.owner_name || '-'}\n` +
      `Limit: ${currentCount}/${maxDevices}\n` +
      `${geoLine}\n` +
      `Cihaz: ${(device_info && device_info.platform) || '-'}\n` +
      `Brauzer: ${(device_info && device_info.userAgent) || '-'}\n` +
      `Ekran: ${(device_info && device_info.screen) || '-'}\n` +
      `Dil: ${(device_info && device_info.language) || '-'}`
    );

    return { statusCode: 403, body: JSON.stringify({ success: false, reason: 'device_limit_reached', current: currentCount, max: maxDevices }) };
  }

  // Yeni cihazı bağla
  await supabase.from('license_devices').insert({
    license_key, device_fingerprint: device_id, device_info: device_info || {}
  });

  await supabase.from('access_attempts').insert({
    license_key, device_fingerprint: device_id, device_info, ip, allowed: true, note: 'device_added', geo
  });

  await notifyTelegram(
    `✅ <b>Yeni cihaz bağlandı (${currentCount + 1}/${maxDevices})</b>\n` +
    `Lisenziya: <code>${license_key}</code>\n` +
    `Sahib: ${license.owner_name || '-'}\n` +
    `${geoLine}\n` +
    `Cihaz: ${(device_info && device_info.platform) || '-'}\n` +
    `Brauzer: ${(device_info && device_info.userAgent) || '-'}`
  );

  const token = sign(`${license_key}:${device_id}`);
  return { statusCode: 200, body: JSON.stringify({ success: true, token }) };
};
