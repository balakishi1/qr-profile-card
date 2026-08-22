const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function sendEmail({ to, replyTo, subject, text }) {
  if (!process.env.RESEND_API_KEY || !to) return { sent: false, reason: !to ? 'no_destination' : 'no_api_key' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'QR Profile Card <onboarding@resend.dev>',
        to: [to],
        reply_to: replyTo || undefined,
        subject,
        text
      })
    });
    if (!r.ok) {
      const errText = await r.text();
      console.error('resend error', errText);
      return { sent: false, reason: 'send_failed' };
    }
    return { sent: true };
  } catch (e) {
    console.error('resend exception', e);
    return { sent: false, reason: 'exception' };
  }
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
    .select('license_key, owner_name, is_active, profile_data')
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

  // Mesajın kimə göndəriləcəyini müəyyən et — YALNIZ profil sahibinə gedir, admin-ə bildiriş göndərilmir:
  // 1) Profil sahibinin özünün təyin etdiyi "əlaqə email"i
  // 2) Yoxdursa, linklər arasında əlavə etdiyi "E-mail" tipli link
  const d = license.profile_data || {};
  let destinationEmail = d.contactEmail;
  if (!destinationEmail) {
    const emailLink = (d.links || []).find(l => l.type === 'email' && l.url);
    if (emailLink) destinationEmail = emailLink.url;
  }

  const emailResult = await sendEmail({
    to: destinationEmail,
    replyTo: email || undefined,
    subject: `Yeni mesaj — ${license.owner_name || 'Profiliniz'} (QR Profile Card)`,
    text: `Ad: ${name}\nEmail: ${email || '-'}\n\nMesaj:\n${message}\n\n---\nBu mesaj sizin QR Profile Card profilinizdəki "Mənimlə əlaqə et" formundan göndərilib.`
  });

  // Qeyd: mesaj bazada saxlanılır (admin panelində "Mesajlar" tabından görünür),
  // amma artıq admin-ə Telegram bildirişi GÖNDƏRİLMİR — mesaj yalnız profil sahibinin email-inə gedir.

  return { statusCode: 200, body: JSON.stringify({ success: true, emailSent: emailResult.sent }) };
};
