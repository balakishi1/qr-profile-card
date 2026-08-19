const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

const ICONS = {
  instagram: '📷', facebook: '📘', linkedin: '💼', telegram: '✈️', whatsapp: '💬',
  tiktok: '🎵', youtube: '▶️', website: '🌐', twitter: '🐦', x: '✕', email: '✉️', phone: '📞', other: '🔗'
};

exports.handler = async (event) => {
  const slug = event.queryStringParameters && event.queryStringParameters.slug;
  if (!slug) return { statusCode: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: '<h1>Tapılmadı</h1><p>Slug göndərilmədi.</p>' };

  const { data: license, error } = await supabase
    .from('licenses')
    .select('owner_name, profile_data, is_active')
    .eq('profile_slug', slug)
    .single();

  if (error || !license || !license.is_active) {
    return { statusCode: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: '<h1>Profil tapılmadı və ya deaktivdir</h1>' };
  }

  const d = license.profile_data || {};
  const avatarHtml = d.avatar
    ? `<img src="${esc(d.avatar)}" class="avatar-img" alt="avatar">`
    : (license.owner_name || '?').slice(0, 1).toUpperCase();

  const phoneDigits = (d.phone || '').replace(/[^\d+]/g, '');
  const phoneBlock = d.phone ? `
    <div class="phone-row">
      <a class="phone-btn" href="tel:${esc(phoneDigits)}">📞 <span>${esc(d.phone)}</span></a>
      <a class="phone-icon-btn" href="https://wa.me/${esc(phoneDigits.replace('+', ''))}" target="_blank" rel="noopener" title="WhatsApp">💬</a>
    </div>` : '';

  const links = (d.links || []).map((l) => {
    const href = l.type === 'phone' ? `tel:${esc((l.url || '').replace(/[^\d+]/g, ''))}` : esc(l.url);
    return `
    <a class="link-card" href="${href}" target="_blank" rel="noopener">
      <span class="icon">${ICONS[l.type] || '🔗'}</span>
      <span class="label">${esc(l.label || l.type)}</span>
      <span class="arrow">→</span>
    </a>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="az"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(license.owner_name || 'Profil')}</title>
<style>
  * { box-sizing: border-box; margin:0; padding:0; -webkit-tap-highlight-color: transparent; }
  body {
    font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
    background: radial-gradient(circle at 50% -10%, #1e2a4a 0%, #0b1220 55%);
    min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px;
  }
  .card {
    position:relative; background:#101a30; border:1px solid rgba(255,255,255,.08);
    border-radius:28px; max-width:420px; width:100%; padding:44px 30px 32px; text-align:center;
    box-shadow:0 30px 70px rgba(0,0,0,.55); overflow:hidden;
  }
  .accent-bar { position:absolute; top:0; left:0; right:0; height:5px; background:linear-gradient(90deg,#6366f1,#8b5cf6); }
  .avatar {
    width:96px; height:96px; border-radius:50%; margin:0 auto 18px; overflow:hidden;
    background:linear-gradient(135deg,#6366f1,#8b5cf6); display:flex; align-items:center; justify-content:center;
    color:#fff; font-size:34px; font-weight:600; border:3px solid rgba(255,255,255,.12);
    box-shadow:0 0 0 6px rgba(99,102,241,.08), 0 12px 30px rgba(99,102,241,.25);
  }
  .avatar-img { width:100%; height:100%; object-fit:cover; }
  h1 { font-size:23px; color:#f3f5fb; font-weight:700; margin-bottom:6px; letter-spacing:-.2px; }
  .bio { color:#94a3c4; font-size:14px; line-height:1.6; margin-bottom:26px; white-space:pre-wrap; }

  .phone-row { display:flex; gap:10px; margin-bottom:22px; }
  .phone-btn {
    flex:1; display:flex; align-items:center; justify-content:center; gap:8px;
    background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; text-decoration:none;
    font-weight:700; font-size:15px; padding:14px 16px; border-radius:14px;
    box-shadow:0 10px 24px rgba(99,102,241,.35);
  }
  .phone-icon-btn {
    width:50px; flex-shrink:0; display:flex; align-items:center; justify-content:center;
    background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); border-radius:14px;
    text-decoration:none; font-size:19px;
  }

  .link-card {
    display:flex; align-items:center; gap:12px; background:rgba(255,255,255,.04);
    border:1px solid rgba(255,255,255,.08); border-radius:14px; padding:15px 18px; margin-bottom:10px;
    text-decoration:none; color:#e7ecf7; font-weight:600; font-size:14.5px; transition:.15s;
  }
  .link-card:active { background:rgba(99,102,241,.15); border-color:#6366f1; }
  .icon { font-size:19px; width:22px; text-align:center; }
  .label { flex:1; text-align:left; }
  .arrow { color:#4b5a7a; font-size:14px; }

  .footer { margin-top:22px; font-size:10.5px; letter-spacing:1.5px; color:#3f4d6b; font-weight:600; }
</style></head>
<body>
  <div class="card">
    <div class="accent-bar"></div>
    <div class="avatar">${avatarHtml}</div>
    <h1>${esc(license.owner_name || '')}</h1>
    ${d.bio ? `<div class="bio">${esc(d.bio)}</div>` : ''}
    ${phoneBlock}
    <div class="links">${links || '<p style="color:#5b6b8c;font-size:13px;">Hələ link əlavə olunmayıb</p>'}</div>
    <div class="footer">QR PROFILE CARD</div>
  </div>
</body></html>`;

  return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html };
};
