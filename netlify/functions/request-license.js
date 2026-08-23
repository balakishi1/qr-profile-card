const crypto = require('crypto');
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

  const { owner_name, owner_email, contact_info, custom_key } = body;
  if (!owner_name || owner_name.trim().length < 2) {
    return { statusCode: 400, body: JSON.stringify({ success: false, reason: 'missing_name' }) };
  }
  if (!owner_email || !owner_email.includes('@')) {
    return { statusCode: 400, body: JSON.stringify({ success: false, reason: 'missing_email' }) };
  }

  let license_key = crypto.randomBytes(3).toString('hex').toUpperCase();
  if (custom_key && custom_key.trim()) {
    license_key = custom_key.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
    if (license_key.length < 3) {
      return { statusCode: 400, body: JSON.stringify({ success: false, reason: 'key_too_short' }) };
    }
  }
  const profile_slug = crypto.randomBytes(6).toString('hex');

  const { data, error } = await supabase
    .from('licenses')
    .insert({
      license_key,
      owner_name: owner_name.trim().slice(0, 100),
      is_active: false, // admin təsdiq etməli olacaq
      profile_slug,
      max_devices: 1,
      profile_data: {
        bio: '', links: [],
        phone: (contact_info || '').slice(0, 50), // telefon indi profildəki "Telefon" sahəsində düzgün görünür
        contactEmail: owner_email.trim().slice(0, 200), // qeydiyyatda verdiyi email avtomatik təyin olunur
        requestNote: (contact_info || '').slice(0, 300)
      }
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505' || /duplicate|unique/i.test(error.message)) {
      return { statusCode: 409, body: JSON.stringify({ success: false, reason: 'key_taken' }) };
    }
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
  }

  await notifyTelegram(
    `🆕 <b>Yeni özünə-xidmət sorğusu</b>\n\n` +
    `👤 Ad: ${esc(owner_name)}\n` +
    `✉️ Email: ${esc(owner_email)}\n` +
    `📞 Əlaqə: ${esc(contact_info || '-')}\n` +
    `🔑 Yaradılan açar: <code>${license_key}</code>\n\n` +
    `Bu açar HAZIRDA DEAKTİVDİR. Təsdiq etmək üçün admin paneldə "Aktivləşdir" düyməsinə bas.`
  );

  return { statusCode: 200, body: JSON.stringify({ success: true, license_key }) };
};
