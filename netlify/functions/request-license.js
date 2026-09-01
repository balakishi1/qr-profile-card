const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { sendEmail } = require('./lib/sendEmail');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function welcomeEmailHtml({ owner_name, license_key, activateUrl }) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px;">
  <tr><td align="center">
  <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 28px 24px;text-align:center;">
      <div style="font-size:32px;">🔗</div>
      <div style="color:#fff;font-size:20px;font-weight:800;margin-top:6px;">QR Profile Card-a xoş gəldin!</div>
    </td></tr>
    <tr><td style="padding:28px;">
      <p style="font-size:15px;color:#0f172a;margin:0 0 14px;">Salam, <b>${owner_name}</b> 👋</p>
      <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 18px;">
        Qeydiyyatın uğurla tamamlandı və hesabın artıq <b>aktivdir</b> — heç bir gözləmə yoxdur.
        QR Profile Card ilə bütün sosial şəbəkələrini, əlaqə məlumatlarını, albomlarını və vizitkanı
        <b>tək bir link/QR kod</b> altında peşəkar şəkildə təqdim edə bilərsən.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:18px;">
        <tr><td style="padding:16px;text-align:center;">
          <div style="font-size:12px;color:#64748b;margin-bottom:6px;">Sənin lisenziya açarın</div>
          <div style="font-size:20px;font-weight:800;letter-spacing:2px;color:#4f46e5;">${license_key}</div>
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:22px;">
        <a href="${activateUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:10px;">Profilimi indi qur →</a>
      </td></tr></table>
      <p style="font-size:13px;color:#334155;line-height:1.6;margin:0 0 8px;"><b>Necə istifadə etməli?</b></p>
      <ol style="font-size:13px;color:#334155;line-height:1.9;margin:0 0 18px;padding-left:18px;">
        <li>Yuxarıdakı düyməyə bas (və ya sayta gir, açarı əl ilə daxil et).</li>
        <li>"Profil" bölməsində adını, şəklini, telefon və sosial şəbəkə linklərini əlavə et.</li>
        <li>"QR Kod" bölməsindən öz QR kodunu yüklə — vizit kartına, mağaza vitrininə, imzana yapışdır.</li>
        <li>İstəsən "Albomlar"a iş nümunələrini, "Post üzərinə" bölməsindən Instagram postuna hazır QR şəkli hazırla.</li>
        <li>Profilini kimsə skan edəndə bütün əlaqələrin bir səhifədə, peşəkar dizaynla açılır.</li>
      </ol>
      <p style="font-size:13px;color:#334155;line-height:1.6;margin:0;">Sualın olsa, sadəcə bu email-ə cavab yaz — birbaşa bizə çatır.</p>
    </td></tr>
    <tr><td style="background:#f8fafc;padding:16px 28px;text-align:center;border-top:1px solid #e2e8f0;">
      <span style="font-size:11px;color:#94a3b8;">QR Profile Card — sosial şəbəkə & vizitka aləti</span>
    </td></tr>
  </table>
  </td></tr>
  </table>
  </body></html>`;
}

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
      is_active: true, // avtomatik aktivləşir, admin təsdiqi lazım deyil
      profile_slug,
      max_devices: 1,
      profile_data: {
        bio: '',
        links: [{ type: 'email', url: owner_email.trim().slice(0, 200), label: 'E-mail', category: '' }],
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
    `🆕 <b>Yeni istifadəçi qeydiyyatdan keçdi (avtomatik aktivləşdi)</b>\n\n` +
    `👤 Ad: ${esc(owner_name)}\n` +
    `✉️ Email: ${esc(owner_email)}\n` +
    `📞 Əlaqə: ${esc(contact_info || '-')}\n` +
    `🔑 Açar: <code>${license_key}</code>\n\n` +
    `Bu açar artıq AKTİVDİR, istifadəçi dərhal öz cihazında aktivləşdirə bilər. Əməliyyat lazım deyil, sadəcə məlumat üçün.`
  );

  const host = (event.headers && (event.headers['x-forwarded-host'] || event.headers.host)) || '';
  const proto = (event.headers && event.headers['x-forwarded-proto']) || 'https';
  const activateUrl = host ? `${proto}://${host}/?key=${encodeURIComponent(license_key)}` : `/?key=${encodeURIComponent(license_key)}`;

  const emailResult = await sendEmail({
    to: owner_email.trim(),
    subject: '🎉 QR Profile Card — hesabın aktivdir, profilini indi qur',
    text:
      `Salam ${owner_name},\n\nQeydiyyatın tamamlandı, hesabın artıq AKTİVDİR.\n\n` +
      `Açarın: ${license_key}\n\nProfilini qurmaq üçün bu linki aç: ${activateUrl}\n\n` +
      `Necə istifadə etməli:\n1) Linkə keç, açar avtomatik doldurulacaq.\n2) Profil bölməsində ad, şəkil, telefon, sosial şəbəkə linklərini doldur.\n` +
      `3) QR Kod bölməsindən öz QR kodunu yüklə.\n4) Albomlar bölməsinə iş nümunələrini əlavə et.\n\nSualın olsa bu email-ə cavab yaz.`,
    html: welcomeEmailHtml({ owner_name: owner_name.trim(), license_key, activateUrl })
  });

  return { statusCode: 200, body: JSON.stringify({ success: true, license_key, activateUrl, emailSent: emailResult.sent }) };
};
