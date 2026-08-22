const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Real, rəngli, tanınan ikonlar (emoji deyil)
const ICON_DEFS = {
  instagram: { gradient: 'linear-gradient(135deg,#f58529,#dd2a7b,#8134af)', color: '#fff',
    path: 'M12 15.2c1.77 0 3.2-1.43 3.2-3.2s-1.43-3.2-3.2-3.2-3.2 1.43-3.2 3.2 1.43 3.2 3.2 3.2zM9 2l-1.83 2H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-2.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z' },
  facebook: { bg: '#1877F2', color: '#fff', letter: 'f' },
  whatsapp: { bg: '#25D366', color: '#fff',
    path: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z' },
  telegram: { bg: '#229ED9', color: '#fff', path: 'M2.01 21L23 12 2.01 3 2 10l15 2-15 2z' },
  tiktok: { bg: '#000000', color: '#fff', path: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z' },
  youtube: { bg: '#FF0000', color: '#fff', path: 'M9.5 8.5v7l6-3.5-6-3.5z' },
  linkedin: { bg: '#0A66C2', color: '#fff', letter: 'in' },
  twitter: { bg: '#000000', color: '#fff', letter: 'X' },
  x: { bg: '#000000', color: '#fff', letter: 'X' },
  email: { bg: '#64748b', color: '#fff', path: 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z' },
  phone: { bg: '#6366f1', color: '#fff',
    path: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z' },
  location: { bg: '#ef4444', color: '#fff', path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' },
  website: { bg: '#0891b2', color: '#fff',
    path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.9 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z' },
  other: { bg: '#94a3b8', color: '#fff', path: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z' }
};

function iconBadge(type, size) {
  const def = ICON_DEFS[type] || ICON_DEFS.other;
  const bg = def.gradient ? `background:${def.gradient};` : `background:${def.bg};`;
  const inner = def.letter
    ? `<span style="color:${def.color};font-weight:800;font-size:${size * 0.42}px;font-family:-apple-system,Arial;">${def.letter}</span>`
    : `<svg viewBox="0 0 24 24" width="${size * 0.56}" height="${size * 0.56}" fill="${def.color}"><path d="${def.path}"/></svg>`;
  return `<span class="ibadge" style="width:${size}px;height:${size}px;${bg}">${inner}</span>`;
}

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

  // Böyük örtük şəkil VARSA — kiçik dairəvi avatar TƏKRAR göstərilmir (dublikat problemi həll edildi)
  const hasCover = !!d.avatar;
  const coverHtml = hasCover ? `
    <div class="cover">
      <img src="${esc(d.avatar)}" class="cover-img" id="coverImg">
      <div class="cover-fade"></div>
    </div>` : '';
  const fallbackAvatarHtml = !hasCover ? `
    <div class="avatar-wrap"><div class="avatar">${(license.owner_name || '?').slice(0, 1).toUpperCase()}</div></div>` : '';

  const phoneDigits = (d.phone || '').replace(/[^\d+]/g, '');
  const waText = d.whatsappMessage ? `?text=${encodeURIComponent(d.whatsappMessage)}` : '';
  const phoneBlock = d.phone ? `
    <div class="phone-row reveal">
      <a class="phone-btn" href="tel:${esc(phoneDigits)}">${iconBadge('phone', 30)} <span>${esc(d.phone)}</span></a>
      <a class="phone-icon-btn" href="https://wa.me/${esc(phoneDigits.replace('+', ''))}${waText}" target="_blank" rel="noopener" title="WhatsApp">${iconBadge('whatsapp', 30)}</a>
    </div>` : '';

  // vCard (kontaktı telefona yadda saxla)
  const emailLink = (d.links || []).find(l => l.type === 'email' && l.url);
  const websiteLink = (d.links || []).find(l => l.type === 'website' && l.url);
  const vcardLines = [
    'BEGIN:VCARD', 'VERSION:3.0',
    `FN:${(license.owner_name || '').replace(/\n/g, ' ')}`,
    d.phone ? `TEL;TYPE=CELL:${d.phone}` : '',
    emailLink ? `EMAIL:${emailLink.url}` : '',
    websiteLink ? `URL:${websiteLink.url}` : '',
    d.bio ? `NOTE:${d.bio.replace(/\n/g, ' ')}` : '',
    'END:VCARD'
  ].filter(Boolean).join('\n');
  const vcardDataUri = 'data:text/vcard;charset=utf-8,' + encodeURIComponent(vcardLines);
  const vcardBlock = `
    <a class="vcard-btn reveal" href="${vcardDataUri}" download="${esc((license.owner_name || 'kontakt').replace(/\s+/g, '_'))}.vcf">
      📇 Kontaktı yadda saxla
    </a>`;

  // Digər profil / biznes keçidi
  const otherProfileBlock = (d.otherProfile && d.otherProfile.url) ? `
    <a class="other-profile-btn reveal" href="${esc(d.otherProfile.url)}" target="_blank" rel="noopener">
      <span>${esc(d.otherProfile.label || 'Digər profilimə bax')}</span>
      <span class="arrow-circle">→</span>
    </a>` : '';

  // İş saatları (klient tərəfdə Bakı vaxtı ilə hesablanacaq)
  const hoursBlock = (d.hours && d.hours.days && d.hours.days.length) ? `
    <div class="hours-badge reveal" id="hoursBadge" data-days="${(d.hours.days || []).join(',')}" data-open="${esc(d.hours.open || '')}" data-close="${esc(d.hours.close || '')}">
      <span id="hoursDot">●</span> <span id="hoursText">Yoxlanılır...</span>
    </div>` : '';

  const allLinks = d.links || [];

  // Xəritəsi olan ünvan linkini ayrıca (böyük xəritə kartı kimi) göstəririk
  const mapLocationLink = allLinks.find(l => l.type === 'location' && l.lat && l.lng);

  // Sosial şəbəkələr — 2 sütunlu düymə şəbəkəsi (xəritəli ünvan buraya düşmür, ayrıca kart kimi göstərilir)
  const links = allLinks.filter(l => l !== mapLocationLink).map((l, idx) => {
    let href = esc(l.url);
    if (l.type === 'phone') href = `tel:${esc((l.url || '').replace(/[^\d+]/g, ''))}`;
    if (l.type === 'location') href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.url || '')}`;
    return `
    <a class="link-tile reveal" style="transition-delay:${Math.min(idx * 50, 400)}ms" href="${href}" target="_blank" rel="noopener">
      ${iconBadge(l.type, 32)}
      <span class="label">${esc(l.label || l.type)}</span>
    </a>`;
  }).join('');

  // Xəritə kartı
  const mapHtml = mapLocationLink ? `
    <a class="map-card reveal" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapLocationLink.url)}" target="_blank" rel="noopener">
      <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${mapLocationLink.lng - 0.01}%2C${mapLocationLink.lat - 0.008}%2C${mapLocationLink.lng + 0.01}%2C${mapLocationLink.lat + 0.008}&marker=${mapLocationLink.lat}%2C${mapLocationLink.lng}&layer=mapnik" loading="lazy"></iframe>
      <div class="map-card-label">🧭 ${esc(mapLocationLink.label || 'Ünvan')}: ${esc(mapLocationLink.url)}</div>
    </a>` : '';

  // Öz haqqımda / statistika bölməsi
  const stats = (d.stats || []).filter(s => s.number || s.label);
  const hasAbout = !!(d.aboutText || d.aboutPhoto || stats.length);
  const aboutPhotoImg = d.aboutPhoto || d.avatar;
  const statsHtml = stats.map(s => `
    <div class="stat-item reveal">
      <div class="stat-number">${esc(s.number)}</div>
      <div class="stat-label">${esc(s.label)}</div>
    </div>`).join('');
  const aboutHtml = hasAbout ? `
    <div class="about-section">
      <div class="about-title reveal">ÖZ HAQQIMDA</div>
      <div class="about-flex">
        ${aboutPhotoImg ? `<div class="about-photo reveal"><img src="${esc(aboutPhotoImg)}" loading="lazy"></div>` : ''}
        ${statsHtml ? `<div class="stats-col">${statsHtml}</div>` : ''}
      </div>
      ${d.aboutText ? `<div class="about-text reveal">${esc(d.aboutText)}</div>` : ''}
    </div>` : '';

  const albums = (d.albums || []).filter(a => a.items && a.items.length);
  const albumsHtml = albums.map((album) => {
    const items = album.items.map((item, idx) => {
      if (item.type === 'video') {
        return `<div class="media-cell reveal" style="transition-delay:${Math.min(idx * 40, 300)}ms" onclick="openLightbox('${esc(item.url)}','video')">
          <video src="${esc(item.url)}" muted preload="metadata"></video>
          <span class="play-icon">▶</span>
        </div>`;
      }
      return `<div class="media-cell reveal" style="transition-delay:${Math.min(idx * 40, 300)}ms" onclick="openLightbox('${esc(item.url)}','image')">
        <img src="${esc(item.url)}" loading="lazy">
      </div>`;
    }).join('');
    return `
    <div class="album-section">
      <div class="album-title reveal">${esc(album.name)}</div>
      <div class="media-grid">${items}</div>
    </div>`;
  }).join('');

  // Sertifikatlar / nailiyyətlər
  const certificates = d.certificates || [];
  const certHtml = certificates.length ? `
    <div class="cert-section">
      <div class="cert-title reveal">🏆 SERTİFİKATLAR</div>
      <div class="cert-strip">
        ${certificates.map((c, idx) => `
          <div class="cert-badge reveal" style="transition-delay:${Math.min(idx * 50, 300)}ms" onclick="openLightbox('${esc(c.url)}','image')">
            <img src="${esc(c.url)}" loading="lazy">
          </div>`).join('')}
      </div>
    </div>` : '';

  // Müştəri rəyləri
  const testimonials = (d.testimonials || []).filter(t => t.text);
  const testimonialsHtml = testimonials.length ? `
    <div class="testimonials-section">
      <div class="testimonials-title reveal">💬 MÜŞTƏRİ RƏYLƏRİ</div>
      ${testimonials.map((t) => `
        <div class="testimonial-card reveal">
          <div class="testimonial-stars">${'⭐'.repeat(t.stars || 5)}</div>
          <div class="testimonial-text">"${esc(t.text)}"</div>
          ${t.name ? `<div class="testimonial-name">— ${esc(t.name)}</div>` : ''}
        </div>`).join('')}
    </div>` : '';

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

  .cover { position:relative; width:100%; height:280px; border-radius:28px; overflow:hidden; margin-bottom:20px; }
  .cover-img { width:100%; height:100%; object-fit:cover; display:block; transform:scale(1.02); will-change:transform; }
  .cover-fade { position:absolute; left:0; right:0; bottom:0; height:110px; background:linear-gradient(to bottom, rgba(13,21,38,0) 0%, rgba(13,21,38,.55) 100%); }

  .reveal { opacity:0; transform:translateY(18px); transition:opacity .55s ease, transform .55s ease; }
  .reveal.in { opacity:1; transform:translateY(0); }

  .top { text-align:center; margin-bottom:20px; }
  .avatar-wrap { position:relative; width:140px; height:140px; margin:0 auto 18px; animation: pop .5s ease .05s both; }
  .avatar {
    width:140px; height:140px; border-radius:50%; overflow:hidden;
    background:linear-gradient(135deg,#6366f1,#8b5cf6); display:flex; align-items:center; justify-content:center;
    color:#fff; font-size:48px; font-weight:700; border:4px solid rgba(255,255,255,.14);
    animation: ringPulse 2.6s ease-in-out infinite;
  }

  h1 {
    font-family:'Baloo 2', -apple-system, sans-serif; font-size:27px; color:#f7f9ff; font-weight:800;
    letter-spacing:.3px; margin-bottom:6px; text-shadow:0 2px 18px rgba(99,102,241,.35);
  }
  .bio { color:#9aa8ca; font-size:14px; line-height:1.55; white-space:pre-wrap; max-width:340px; margin:0 auto; }

  .ibadge { border-radius:50%; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }

  .phone-row { display:flex; gap:10px; margin-bottom:20px; align-items:center; }
  .phone-btn {
    flex:1; display:flex; align-items:center; justify-content:center; gap:10px;
    background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; text-decoration:none;
    font-weight:700; font-size:15px; padding:12px 16px; border-radius:16px;
    box-shadow:0 10px 26px rgba(99,102,241,.4);
  }
  .phone-icon-btn {
    width:52px; height:52px; flex-shrink:0; display:flex; align-items:center; justify-content:center;
    background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); border-radius:16px;
    text-decoration:none;
  }

  .links-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:8px; }
  .link-tile {
    display:flex; align-items:center; gap:10px; background:rgba(255,255,255,.045);
    border:1px solid rgba(255,255,255,.09); border-radius:16px; padding:13px 14px;
    text-decoration:none; color:#eef1fb; font-weight:600; font-size:13.5px; transition:.15s;
  }
  .link-tile:active { background:rgba(139,92,246,.18); border-color:#8b5cf6; transform:scale(.97); }
  .link-tile .label { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

  .vcard-btn {
    display:flex; align-items:center; justify-content:center; gap:8px; width:100%;
    background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14); border-radius:15px;
    padding:13px; color:#eef1fb; font-weight:700; font-size:14px; text-decoration:none; margin-bottom:14px;
  }
  .vcard-btn:active { background:rgba(255,255,255,.1); }

  .other-profile-btn {
    display:flex; align-items:center; justify-content:space-between; width:100%;
    background:linear-gradient(135deg,rgba(99,102,241,.18),rgba(139,92,246,.18));
    border:1px solid rgba(139,92,246,.4); border-radius:16px; padding:15px 18px;
    color:#eef1fb; font-weight:700; font-size:14px; text-decoration:none; margin-bottom:16px;
  }
  .arrow-circle {
    width:28px; height:28px; border-radius:50%; background:rgba(255,255,255,.12);
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }

  .hours-badge {
    display:inline-flex; align-items:center; gap:7px; background:rgba(255,255,255,.05);
    border:1px solid rgba(255,255,255,.1); border-radius:20px; padding:8px 16px; font-size:12.5px;
    color:#c7d0e8; margin:0 auto 18px; width:fit-content; font-weight:600;
  }
  .hours-badge.open #hoursDot { color:#22c55e; }
  .hours-badge.closed #hoursDot { color:#ef4444; }

  .map-card { display:block; text-decoration:none; margin-bottom:16px; border-radius:18px; overflow:hidden; border:1px solid rgba(255,255,255,.1); }
  .map-card iframe { width:100%; height:160px; border:none; display:block; filter:grayscale(.2) invert(.92) contrast(.9) brightness(.95); pointer-events:none; }
  .map-card-label { background:rgba(255,255,255,.04); color:#c7d0e8; font-size:12.5px; padding:10px 14px; font-weight:600; }

  .cert-section { margin-top:28px; }
  .cert-title { font-size:14px; font-weight:700; color:#c7d0e8; letter-spacing:1px; margin-bottom:12px; text-align:center; }
  .cert-strip { display:flex; gap:10px; overflow-x:auto; padding-bottom:6px; }
  .cert-badge {
    flex:0 0 90px; height:110px; border-radius:12px; overflow:hidden; cursor:pointer;
    border:2px solid rgba(255,255,255,.15); box-shadow:0 8px 18px rgba(0,0,0,.3);
  }
  .cert-badge img { width:100%; height:100%; object-fit:cover; }

  .testimonials-section { margin-top:28px; }
  .testimonials-title { font-size:14px; font-weight:700; color:#c7d0e8; letter-spacing:1px; margin-bottom:14px; text-align:center; }
  .testimonial-card {
    background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.09); border-radius:16px;
    padding:16px 18px; margin-bottom:12px;
  }
  .testimonial-stars { font-size:13px; margin-bottom:8px; }
  .testimonial-text { color:#dbe1f3; font-size:13.5px; line-height:1.55; font-style:italic; }
  .testimonial-name { color:#8b9bb8; font-size:12.5px; margin-top:8px; text-align:right; }

  .about-section { margin-top:30px; }
  .about-title {
    font-family:'Baloo 2', -apple-system, sans-serif; font-weight:800; font-size:21px; color:#f7f9ff;
    text-align:center; margin-bottom:18px; letter-spacing:.5px;
  }
  .about-flex { display:flex; gap:16px; align-items:stretch; margin-bottom:16px; }
  .about-photo { width:38%; flex-shrink:0; border-radius:20px; overflow:hidden; box-shadow:0 16px 34px rgba(0,0,0,.45); aspect-ratio:3/4; }
  .about-photo img { width:100%; height:100%; object-fit:cover; display:block; }
  .stats-col { flex:1; display:flex; flex-direction:column; justify-content:center; gap:16px; }
  .stat-number { font-family:'Baloo 2', -apple-system, sans-serif; font-weight:800; font-size:28px; color:#a78bfa; line-height:1; }
  .stat-label { font-size:12px; color:#9aa8ca; margin-top:3px; }
  .about-text { color:#9aa8ca; font-size:13.5px; line-height:1.65; white-space:pre-wrap; }

  .footer { margin-top:30px; text-align:center; font-size:10.5px; letter-spacing:2px; color:#3f4d6b; font-weight:700; }

  .album-section { margin-top:26px; }
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

  .contact-section {
    margin-top:32px; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.09);
    border-radius:22px; padding:24px 20px;
  }
  .contact-title { font-family:'Baloo 2', -apple-system, sans-serif; font-weight:800; font-size:21px; color:#f7f9ff; margin-bottom:6px; text-align:center; }
  .contact-sub { font-size:12.5px; color:#8b9bb8; margin-bottom:18px; text-align:center; line-height:1.5; }
  .contact-input, .contact-textarea {
    width:100%; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.13); border-radius:13px;
    padding:13px 15px; color:#eef1fb; font-size:14px; margin-bottom:11px; font-family:inherit; outline:none;
  }
  .contact-input:focus, .contact-textarea:focus { border-color:#8b5cf6; }
  .contact-textarea { resize:vertical; min-height:90px; }
  .contact-submit {
    width:100%; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; border:none;
    padding:14px; border-radius:13px; font-weight:700; font-size:15px; cursor:pointer;
    box-shadow:0 10px 26px rgba(99,102,241,.35);
  }
  .contact-submit:active { transform:scale(.98); }
  .contact-feedback { margin-top:12px; font-size:13px; text-align:center; min-height:18px; }

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
    ${coverHtml}
    <div class="top">
      ${fallbackAvatarHtml}
      <h1>${esc(license.owner_name || '')}</h1>
      ${d.bio ? `<div class="bio">${esc(d.bio)}</div>` : ''}
    </div>
    ${hoursBlock ? `<div style="text-align:center;">${hoursBlock}</div>` : ''}
    ${vcardBlock}
    ${otherProfileBlock}
    ${phoneBlock}
    ${mapHtml}
    <div class="links-grid">${links || ''}</div>
    ${aboutHtml}
    ${certHtml}
    ${testimonialsHtml}
    ${albumsHtml}

    <div class="contact-section reveal">
      <div class="contact-title">Bizimlə əlaqə</div>
      <div class="contact-sub">Sual və ya təklifinizi qeyd edə bilərsiniz. Sizə ən qısa zamanda cavab verək.</div>
      <input type="text" id="cName" class="contact-input" placeholder="Adınız">
      <input type="email" id="cEmail" class="contact-input" placeholder="E-poçt ünvanınız">
      <textarea id="cMsg" class="contact-textarea" placeholder="Mesajınızı yazın"></textarea>
      <button class="contact-submit" onclick="submitContact()">Göndər</button>
      <div class="contact-feedback" id="contactFeedback"></div>
    </div>

    <div class="footer">QR PROFILE CARD</div>
  </div>

  <div class="lightbox" id="lightbox" onclick="closeLightbox(event)">
    <button class="lightbox-close" onclick="closeLightbox(event)">✕</button>
    <div id="lightboxContent"></div>
  </div>

  <script>
    const PROFILE_SLUG = ${JSON.stringify(slug)};

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

    async function submitContact() {
      const name = document.getElementById('cName').value.trim();
      const email = document.getElementById('cEmail').value.trim();
      const message = document.getElementById('cMsg').value.trim();
      const feedback = document.getElementById('contactFeedback');
      if (!name || !message) {
        feedback.style.color = '#ef4444';
        feedback.textContent = 'Zəhmət olmasa ad və mesaj yazın.';
        return;
      }
      feedback.style.color = '#9aa8ca';
      feedback.textContent = 'Göndərilir...';
      try {
        const r = await fetch('/.netlify/functions/contact-submit', {
          method: 'POST',
          body: JSON.stringify({ slug: PROFILE_SLUG, name, email, message })
        });
        const j = await r.json();
        if (j.success) {
          feedback.style.color = '#22c55e';
          feedback.textContent = '✅ Mesajınız göndərildi! Tezliklə sizinlə əlaqə saxlanılacaq.';
          document.getElementById('cName').value = '';
          document.getElementById('cEmail').value = '';
          document.getElementById('cMsg').value = '';
        } else {
          feedback.style.color = '#ef4444';
          feedback.textContent = 'Xəta baş verdi, bir az sonra cəhd edin.';
        }
      } catch (e) {
        feedback.style.color = '#ef4444';
        feedback.textContent = 'Şəbəkə xətası.';
      }
    }

    // Scroll ilə görünən elementlərin canlanması
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

    // Üst şəklə yüngül parallax effekti
    const coverImg = document.getElementById('coverImg');
    if (coverImg) {
      window.addEventListener('scroll', () => {
        const y = Math.min(window.scrollY, 260);
        coverImg.style.transform = 'translateY(' + (y * 0.18) + 'px) scale(' + (1.02 + y * 0.0005) + ')';
      }, { passive: true });
    }

    // İş saatları statusu — Bakı vaxtı ilə hesablanır
    const hoursBadge = document.getElementById('hoursBadge');
    if (hoursBadge) {
      const dayMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
      const workDays = (hoursBadge.dataset.days || '').split(',').filter(Boolean).map(d => dayMap[d]);
      const openTime = hoursBadge.dataset.open || '09:00';
      const closeTime = hoursBadge.dataset.close || '18:00';
      try {
        const bakuStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Baku', hour12: false });
        const bakuNow = new Date(bakuStr);
        const day = bakuNow.getDay();
        const minutesNow = bakuNow.getHours() * 60 + bakuNow.getMinutes();
        const [oh, om] = openTime.split(':').map(Number);
        const [ch, cm] = closeTime.split(':').map(Number);
        const openMinutes = oh * 60 + om, closeMinutes = ch * 60 + cm;
        const isOpen = workDays.includes(day) && minutesNow >= openMinutes && minutesNow < closeMinutes;
        hoursBadge.classList.add(isOpen ? 'open' : 'closed');
        document.getElementById('hoursText').textContent = isOpen
          ? 'Hazırda açıqdır'
          : 'Hazırda bağlıdır';
      } catch (e) {}
    }
  </script>
</body></html>`;

  return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html };
};
