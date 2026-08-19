const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

const ICONS = {
  instagram: '📷', facebook: '📘', linkedin: '💼', telegram: '✈️', whatsapp: '💬',
  tiktok: '🎵', youtube: '▶️', website: '🌐', twitter: '🐦', x: '✕', email: '✉️',
  phone: '📞', location: '📍', other: '🔗'
};

// Sürətli baxış üçün üst sırada göstərilən "əlaqə" tipli ikonlar
const QUICK_TYPES = ['whatsapp', 'instagram', 'facebook', 'linkedin', 'telegram', 'tiktok', 'youtube', 'twitter'];

exports.handler = async (event) => {
  let slug = event.queryStringParameters && event.queryStringParameters.slug;

  if (!slug) {
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

  const allLinks = d.links || [];

  // Sürətli ikon sırası (yalnız url dolu olanlar)
  const quickIcons = allLinks
    .filter(l => QUICK_TYPES.includes(l.type) && l.url)
    .map(l => `<a class="quick-icon" href="${esc(l.url)}" target="_blank" rel="noopener" title="${esc(l.label || l.type)}">${ICONS[l.type] || '🔗'}</a>`)
    .join('');

  // Aşağıdakı tam link siyahısı (location xüsusi işlənir)
  const links = allLinks.map((l) => {
    let href = esc(l.url);
    if (l.type === 'phone') href = `tel:${esc((l.url || '').replace(/[^\d+]/g, ''))}`;
    if (l.type === 'location') href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.url || '')}`;
    return `
    <a class="link-card" href="${href}" target="_blank" rel="noopener">
      <span class="icon">${ICONS[l.type] || '🔗'}</span>
      <span class="label">${esc(l.label || l.type)}</span>
      <span class="arrow">${l.type === 'location' ? '🧭' : '→'}</span>
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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin:0; padding:0; -webkit-tap-highlight-color: transparent; }
  html { scroll-behavior:smooth; }
  body {
    font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
    background:
      radial-gradient(circle at 50% -10%, #24325c 0%, #0b1220 55%),
      repeating-linear-gradient(0deg, rgba(255,255,255,.025) 0px, rgba(255,255,255,.025) 1px, transparent 1px, transparent 42px),
      repeating-linear-gradient(90deg, rgba(255,255,255,.025) 0px, rgba(255,255,255,.025) 1px, transparent 1px, transparent 42px);
    background-color:#0b1220;
    min-height:100vh; padding:28px 20px 50px; display:flex; justify-content:center;
  }
  .page { width:100%; max-width:440px; animation: fadeUp .6s ease both; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px);} to { opacity:1; transform:translateY(0);} }
  @keyframes pop { 0%{transform:scale(.9);opacity:0;} 100%{transform:scale(1);opacity:1;} }
  @keyframes ringPulse { 0%,100%{box-shadow:0 0 0 0 rgba(139,92,246,.35);} 50%{box-shadow:0 0 0 10px rgba(139,92,246,0);} }

  .top { text-align:center; margin-bottom:8px; }
  .avatar-wrap { position:relative; width:150px; height:150px; margin:0 auto 18px; animation: pop .5s ease .05s both; }
  .avatar {
    width:150px; height:150px; border-radius:50%; overflow:hidden;
    background:linear-gradient(135deg,#6366f1,#8b5cf6); display:flex; align-items:center; justify-content:center;
    color:#fff; font-size:52px; font-weight:700; border:4px solid rgba(255,255,255,.14);
    animation: ringPulse 2.6s ease-in-out infinite;
  }
  .avatar-img { width:100%; height:100%; object-fit:cover; }

  h1 {
    font-family:'Baloo 2', -apple-system, sans-serif; font-size:28px; color:#f7f9ff; font-weight:800;
    letter-spacing:.3px; margin-bottom:6px; text-shadow:0 2px 18px rgba(99,102,241,.35);
  }
  .bio { color:#9aa8ca; font-size:14px; line-height:1.55; margin-bottom:18px; white-space:pre-wrap; max-width:340px; margin-left:auto; margin-right:auto; }

  .quick-icons { display:flex; justify-content:center; gap:10px; flex-wrap:wrap; margin-bottom:22px; }
  .quick-icon {
    width:46px; height:46px; border-radius:50%; display:flex; align-items:center; justify-content:center;
    background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); font-size:19px;
    text-decoration:none; transition:.15s;
  }
  .quick-icon:active { background:rgba(139,92,246,.25); transform:scale(.94); }

  .phone-row { display:flex; gap:10px; margin-bottom:18px; }
  .phone-btn {
    flex:1; display:flex; align-items:center; justify-content:center; gap:8px;
    background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; text-decoration:none;
    font-weight:700; font-size:15px; padding:15px 16px; border-radius:16px;
    box-shadow:0 10px 26px rgba(99,102,241,.4);
  }
  .phone-icon-btn {
    width:52px; flex-shrink:0; display:flex; align-items:center; justify-content:center;
    background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); border-radius:16px;
    text-decoration:none; font-size:20px;
  }

  .links { margin-bottom:6px; }
  .link-card {
    display:flex; align-items:center; gap:13px; background:rgba(255,255,255,.045);
    border:1px solid rgba(255,255,255,.09); border-radius:18px; padding:16px 18px; margin-bottom:11px;
    text-decoration:none; color:#eef1fb; font-weight:600; font-size:15px; transition:.15s;
    backdrop-filter: blur(6px);
  }
  .link-card:active { background:rgba(139,92,246,.18); border-color:#8b5cf6; transform:scale(.985); }
  .icon { font-size:20px; width:24px; text-align:center; flex-shrink:0; }
  .label { flex:1; text-align:left; }
  .arrow { color:#5b6b8c; font-size:15px; flex-shrink:0; }

  .footer { margin-top:26px; text-align:center; font-size:10.5px; letter-spacing:2px; color:#3f4d6b; font-weight:700; }

  .album-section { margin-top:24px; }
  .album-title { color:#c7d0e8; font-weight:700; font-size:15px; margin-bottom:10px; padding-left:2px; }
  .media-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
  .media-cell {
    position:relative; aspect-ratio:1; border-radius:14px; overflow:hidden; cursor:pointer;
    background:#0d1526; border:1px solid rgba(255,255,255,.07);
  }
  .media-cell img, .media-cell video { width:100%; height:100%; object-fit:cover; display:block; }
  .play-icon {
    position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
    width:34px; height:34px; background:rgba(0,0,0,.6); color:#fff; border-radius:50%;
    display:flex; align-items:center; justify-content:center; font-size:13px;
  }

  .lightbox {
    display:none; position:fixed; inset:0; background:rgba(5,8,16,.94); z-index:999;
    align-items:center; justify-content:center; padding:24px;
  }
  .lightbox.open { display:flex; }
  .lightbox img, .lightbox video { max-width:100%; max-height:90vh; border-radius:14px; }
  .lightbox-close {
    position:absolute; top:20px; right:20px; width:42px; height:42px; border-radius:50%;
    background:rgba(255,255,255,.12); color:#fff; border:none; font-size:20px; cursor:pointer;
  }
</style></head>
<body>
  <div class="page">
    <div class="top">
      <div class="avatar-wrap"><div class="avatar">${avatarHtml}</div></div>
      <h1>${esc(license.owner_name || '')}</h1>
      ${d.bio ? `<div class="bio">${esc(d.bio)}</div>` : ''}
      ${quickIcons ? `<div class="quick-icons">${quickIcons}</div>` : ''}
    </div>
    ${phoneBlock}
    <div class="links">${links || '<p style="color:#5b6b8c;font-size:13px;text-align:center;">Hələ link əlavə olunmayıb</p>'}</div>
    ${albumsHtml}
    <div class="footer">QR PROFILE CARD</div>
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
