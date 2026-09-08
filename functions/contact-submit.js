const { createClient } = require('@supabase/supabase-js');
const { sendEmail } = require('./lib/sendEmail');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

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

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      emailSent: emailResult.sent,
      reason: emailResult.reason || null,
      detail: emailResult.detail || null
    })
  };
};
