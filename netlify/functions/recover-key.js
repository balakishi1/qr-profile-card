const { createClient } = require('@supabase/supabase-js');
const { sendEmail } = require('./lib/sendEmail');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: JSON.stringify({ success: false }) }; }

  const email = String(body.email || '').trim().toLowerCase();
  // Cavab hər zaman eyni formatdadır (uğurlu/uğursuz fərq etmir) — email-in bu platformada
  // qeydiyyatda olub-olmadığını bayıra sızdırmamaq üçün (enumeration attack qarşısını almaq).
  const genericOk = { statusCode: 200, body: JSON.stringify({ success: true }) };

  if (!email || !email.includes('@')) return genericOk;

  try {
    let { data: license } = await supabase
      .from('licenses')
      .select('license_key, owner_name, is_active')
      .eq('google_email', email)
      .maybeSingle();

    if (!license) {
      const r2 = await supabase
        .from('licenses')
        .select('license_key, owner_name, is_active')
        .eq('profile_data->>contactEmail', email)
        .maybeSingle();
      license = r2.data || null;
    }

    if (license && license.is_active) {
      await sendEmail({
        to: email,
        subject: '🔑 QR Profile Card — açarın',
        text:
          `Salam ${license.owner_name || ''},\n\nAçarını bərpa etmək üçün sorğu göndərdin.\n\n` +
          `Açarın: ${license.license_key}\n\nProfilinə daxil olmaq üçün: https://${event.headers['x-forwarded-host'] || event.headers.host}/?key=${encodeURIComponent(license.license_key)}\n\n` +
          `Əgər bu sorğunu sən göndərməmisənsə, bu email-i sadəcə görməzdən gəl.`,
        html:
          `<p>Salam <b>${(license.owner_name || '').replace(/[<>&]/g, '')}</b>,</p>` +
          `<p>Açarını bərpa etmək üçün sorğu göndərdin.</p>` +
          `<p style="font-size:20px;font-weight:800;letter-spacing:2px;background:#f5f8fd;padding:12px 16px;border-radius:10px;display:inline-block;">${license.license_key}</p>` +
          `<p><a href="https://${event.headers['x-forwarded-host'] || event.headers.host}/?key=${encodeURIComponent(license.license_key)}">Profilinə daxil ol →</a></p>` +
          `<p style="color:#888;font-size:12px;">Əgər bu sorğunu sən göndərməmisənsə, bu email-i sadəcə görməzdən gəl.</p>`
      });
    }
  } catch (e) {
    console.error('recover-key error', e);
  }

  return genericOk;
};
