const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function sendEmail({ to, subject, text }) {
  if (!process.env.RESEND_API_KEY || !to) return false;
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
        subject,
        text
      })
    });
    return r.ok;
  } catch (e) {
    console.error('resend error', e);
    return false;
  }
}

exports.handler = async (event) => {
  const pass = event.headers['x-admin-password'];
  if (!process.env.ADMIN_PASSWORD || pass !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: 'unauthorized' }) };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ success: false }) };
  }

  const { subject, message } = body;
  if (!subject || !message) {
    return { statusCode: 400, body: JSON.stringify({ success: false, reason: 'missing_fields' }) };
  }

  const { data: licenses, error } = await supabase
    .from('licenses')
    .select('license_key, owner_name, is_active, profile_data')
    .eq('is_active', true);

  if (error) return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };

  let sent = 0, skipped = 0;
  const skippedList = [];

  for (const lic of licenses || []) {
    const d = lic.profile_data || {};
    let destination = d.contactEmail;
    if (!destination) {
      const emailLink = (d.links || []).find(l => l.type === 'email' && l.url);
      if (emailLink) destination = emailLink.url;
    }
    if (!destination) {
      skipped++;
      skippedList.push(lic.owner_name || lic.license_key);
      continue;
    }
    const ok = await sendEmail({
      to: destination,
      subject,
      text: `${message}\n\n---\nQR Profile Card sistemindən avtomatik göndərilib.`
    });
    if (ok) sent++; else { skipped++; skippedList.push(lic.owner_name || lic.license_key); }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, sent, skipped, skippedList, total: (licenses || []).length })
  };
};
