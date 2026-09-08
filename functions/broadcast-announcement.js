const { createClient } = require('@supabase/supabase-js');
const { sendEmail } = require('./lib/sendEmail');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

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
      skippedList.push(`${lic.owner_name || lic.license_key} (email yoxdur)`);
      continue;
    }
    const result = await sendEmail({
      to: destination,
      subject,
      text: `${message}\n\n---\nQR Profile Card sistemindən avtomatik göndərilib.`
    });
    if (result.sent) {
      sent++;
    } else {
      skipped++;
      skippedList.push(`${lic.owner_name || lic.license_key} (${destination}): ${result.reason}${result.detail ? ' — ' + result.detail : ''}`);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, sent, skipped, skippedList, total: (licenses || []).length })
  };
};
