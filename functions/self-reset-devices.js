const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function notifyTelegram(text) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' })
    });
  } catch (e) { console.error('telegram error', e); }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ success: false }) };
  }

  const { license_key } = body;
  if (!license_key) return { statusCode: 400, body: JSON.stringify({ success: false }) };

  const { data: license, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('license_key', license_key)
    .single();

  if (error || !license || !license.is_active) {
    return { statusCode: 404, body: JSON.stringify({ success: false, reason: 'not_found' }) };
  }

  const ip = event.headers['x-forwarded-for'] || 'unknown';

  await supabase.from('license_devices').delete().eq('license_key', license_key);

  await supabase.from('access_attempts').insert({
    license_key, ip, allowed: true, note: 'self_reset_by_owner'
  });

  await notifyTelegram(
    `♻️ <b>Özünə-xidmət sıfırlama</b>\nLisenziya: <code>${license_key}</code>\nSahib: ${license.owner_name || '-'}\nBu adam öz cihazlarını özü sıfırladı (blok problemi ilə qarşılaşıb).\nİP: ${ip}\n\nƏgər bu sən deyilsənsə, dərhal admin panelindən açarı söndür!`
  );

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
