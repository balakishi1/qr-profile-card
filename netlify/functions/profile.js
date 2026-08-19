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
  let slug = event.queryStringParameters && event.queryStringParameters.slug;

  if (!slug) {
    // Fallback: birbaşa path-dan çıxar (redirect query ötürməsə belə işləsin)
    const candidates = [event.path || ''];
    if (event.rawUrl) {
      try { candidates.push(new URL(event.rawUrl).pathname); } catch (e) {}
    }
    for (const rawPath of candidates) {
      const parts = rawPath.split('/').filter(Boolean);
      const idx = parts.indexOf('p');
      if (idx !== -1 && parts[idx + 1]) { slug = parts[idx + 1]; break; }
    }
  }

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

  const albums = (d.albums || []).filter(a => a.items && a.items.length);
  const albumsHtml = albums.map((album) => {
    const items = album.items.map((item) => {
      if (item.type === 'video') {
        return `<div class="media-cell" onclick="openLightbox('${esc(item.url)}','video')">
          <video src="${esc(item.url)}" muted preload="metadata"></video>
          <span class="play-icon">▶</span>
        </div>`;
      }
      return `<div class="media-cell" onclick="openLightbox('${esc(item.url)}','image')">
        <img src="${esc(item.url)}" loading="lazy">
      </div>`;
    }).join('');
    return `
    <div class="album-section">
      <div class="album-title">${esc(album.name)}</div>
      <div class="media-grid">${items}</div>
    </div>`;
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
    min-height:100vh; padding:24px; display:flex; justify-content:center;
  }
  .page { width:100%; max-width:460px; }
  .card {
    position:relative; background:#101a30; border:1px solid rgba(255,255,255,.08);
    border-radius:28px; width:100%; padding:44px 30px 32px; text-align:center;
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

  .album-section { margin-top:22px; }
  .album-title { color:#c7d0e8; font-weight:700; font-size:15px; margin-bottom:10px; text-align:left; padding-left:2px; }
  .media-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
  .media-cell {
    position:relative; aspect-ratio:1; border-radius:12px; overflow:hidden; cursor:pointer;
    background:#0d1526; border:1px solid rgba(255,255,255,.06);
  }
  .media-cell img, .media-cell video { width:100%; height:100%; object-fit:cover; display:block; }
  .play-icon {
    position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
    width:34px; height:34px; background:rgba(0,0,0,.55); color:#fff; border-radius:50%;
    display:flex; align-items:center; justify-content:center; font-size:13px;
  }

  .lightbox {
    display:none; position:fixed; inset:0; background:rgba(5,8,16,.92); z-index:999;
    align-items:center; justify-content:center; padding:24px;
  }
  .lightbox.open { display:flex; }
  .lightbox img, .lightbox video { max-width:100%; max-height:90vh; border-radius:12px; }
  .lightbox-close {
    position:absolute; top:20px; right:20px; width:40px; height:40px; border-radius:50%;
    background:rgba(255,255,255,.1); color:#fff; border:none; font-size:20px; cursor:pointer;
  }
</style></head>
<body>
  <div class="page">
    <div class="card">
      <div class="accent-bar"></div>
      <div class="avatar">${avatarHtml}</div>
      <h1>${esc(license.owner_name || '')}</h1>
      ${d.bio ? `<div class="bio">${esc(d.bio)}</div>` : ''}
      ${phoneBlock}
      <div class="links">${links || '<p style="color:#5b6b8c;font-size:13px;">Hələ link əlavə olunmayıb</p>'}</div>
      ${albumsHtml}
      <div class="footer">QR PROFILE CARD</div>
    </div>
  </div>

  <div class="lightbox" id="lightbox" onclick="closeLightbox(event)">
    <button class="lightbox-close" onclick="closeLightbox(event)">✕</button>
    <div id="lightboxContent"></div>
  </div>

  <script>
    function openLightbox(url, type) {
      const box = document.getElementById('lightbox');
      const content = document.getElementById('lightboxContent');
      content.innerHTML = type === 'video'
        ? '<video src="' + url + '" controls autoplay playsinline></video>'
        : '<img src="' + url + '">';
      box.classList.add('open');
    }
    function closeLightbox(e) {
      if (e.target.tagName === 'VIDEO') return;
      document.getElementById('lightbox').classList.remove('open');
      document.getElementById('lightboxContent').innerHTML = '';
    }
  </script>
</body></html>`;

  return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html };
};
