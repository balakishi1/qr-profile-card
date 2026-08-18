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
  if (!slug) return { statusCode: 404, headers: { 'Content-Type': 'text/html' }, body: '<h1>Tapılmadı</h1>' };

  const { data: license, error } = await supabase
    .from('licenses')
    .select('owner_name, profile_data, is_active')
    .eq('profile_slug', slug)
    .single();

  if (error || !license || !license.is_active) {
    return { statusCode: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: '<h1>Profil tapılmadı və ya deaktivdir</h1>' };
  }

  const d = license.profile_data || {};
  const links = (d.links || []).map((l) => `
    <a class="link-card" href="${esc(l.url)}" target="_blank" rel="noopener">
      <span class="icon">${ICONS[l.type] || '🔗'}</span>
      <span class="label">${esc(l.label || l.type)}</span>
    </a>`).join('');

  const html = `<!DOCTYPE html>
<html lang="az"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(license.owner_name || 'Profil')}</title>
<style>
  * { box-sizing: border-box; margin:0; padding:0; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(160deg,#0f172a,#1e293b); min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
  .card { background:#fff; border-radius:24px; max-width:420px; width:100%; padding:36px 28px; box-shadow:0 20px 60px rgba(0,0,0,.4); text-align:center; }
  .avatar { width:88px; height:88px; border-radius:50%; background:linear-gradient(135deg,#6366f1,#8b5cf6); margin:0 auto 16px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:32px; font-weight:700; }
  h1 { font-size:22px; color:#0f172a; margin-bottom:6px; }
  .bio { color:#64748b; font-size:14px; line-height:1.5; margin-bottom:24px; white-space:pre-wrap; }
  .link-card { display:flex; align-items:center; gap:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:14px 18px; margin-bottom:10px; text-decoration:none; color:#0f172a; font-weight:600; font-size:14px; transition:.15s; }
  .link-card:hover { background:#eef2ff; border-color:#6366f1; transform:translateY(-1px); }
  .icon { font-size:20px; }
  .footer { margin-top:20px; font-size:11px; color:#94a3b8; }
</style></head>
<body>
  <div class="card">
    <div class="avatar">${esc((license.owner_name || '?').slice(0, 1).toUpperCase())}</div>
    <h1>${esc(license.owner_name || '')}</h1>
    <div class="bio">${esc(d.bio || '')}</div>
    <div class="links">${links || '<p style="color:#94a3b8;font-size:13px;">Hələ link əlavə olunmayıb</p>'}</div>
    <div class="footer">QR Profile Card</div>
  </div>
</body></html>`;

  return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html };
};
