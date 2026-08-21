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

function esc(s) {
  return String(s || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ success: false }) };
  }

  const { slug, name, email, message } = body;
  if (!slug || !name || !message) {
    return { statusCode: 400, body: JSON.stringify({ success: false, reason: 'missing_fields' }) };
  }

  const { data: license, error } = await supabase
    .from('licenses')
    .select('license_key, owner_name, is_active')
    .eq('profile_slug', slug)
    .single();

  if (error || !license || !license.is_active) {
    return { statusCode: 404, body: JSON.stringify({ success: false }) };
  }

  await supabase.from('contact_messages').insert({
    license_key: license.license_key,
    name: String(name).slice(0, 200),
    email: String(email || '').slice(0, 200),
    message: String(message).slice(0, 2000)
  });

  await notifyTelegram(
    `📩 <b>Yeni mesaj — "${esc(license.owner_name || license.license_key)}" profilindən</b>\n\n` +
    `👤 Ad: ${esc(name)}\n` +
    `✉️ Email: ${esc(email || '-')}\n` +
    `💬 Mesaj: ${esc(message)}`
  );

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
