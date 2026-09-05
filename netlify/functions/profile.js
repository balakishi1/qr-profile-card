const { createClient } = require('@supabase/supabase-js');
const { sign } = require('./lib/deviceAuth');

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
    .select('owner_name, profile_data, is_active, profile_views')
    .eq('profile_slug', slug)
    .single();

  if (error || !license || !license.is_active) {
    console.error('PROFILE_LOOKUP_FAIL', {
      slug,
      hasEnvUrl: !!process.env.SUPABASE_URL,
      envUrl: process.env.SUPABASE_URL,
      hasEnvKey: !!process.env.SUPABASE_SERVICE_KEY,
      errorMessage: error && error.message,
      errorCode: error && error.code,
      errorDetails: error && error.details,
      errorHint: error && error.hint,
      license
    });
    return { statusCode: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: '<h1>Profil tapılmadı və ya deaktivdir</h1>' };
  }

  const newViews = (license.profile_views || 0) + 1;
  try { await supabase.from('licenses').update({ profile_views: newViews }).eq('profile_slug', slug); } catch (e) {}
  // Qeyd: "kim baxıb" (geolocation) qeydi artıq burada EDİLMİR — səhifə HTML-i göndərildikdən
  // SONRA, brauzerin özündən (aşağıdakı <script> daxilində, səhifə yükləndikdən sonra)
  // /.netlify/functions/log-profile-view çağırılır. Beləliklə geolocation axtarışı
  // (bəzən 1 saniyədən çox çəkə bilir) səhifənin açılış sürətinə HEÇ təsir etmir.

  const d = license.profile_data || {};

  // Çox-dilli mətn sahəsindən (bio/aboutText) müəyyən dilin mətnini seçir.
  // Köhnə profillərdə bu sahələr sadə mətn (string) kimi saxlanılıb — həm ona, həm də
  // yeni {az,en,ru} formatına dəstək verir.
  function pickLang(field, lang) {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[lang] || field.az || field.en || field.ru || '';
  }
  const bioI18n = (d.bio && typeof d.bio === 'object') ? d.bio : { az: d.bio || '', en: '', ru: '' };
  const aboutI18n = (d.aboutText && typeof d.aboutText === 'object') ? d.aboutText : { az: d.aboutText || '', en: '', ru: '' };

  // Ziyarətçinin brauzer dilinə görə ilkin dil (server-side ilk render üçün) — sonra JS ilə anında dəyişdirilə bilər
  const acceptLang = ((event.headers && event.headers['accept-language']) || '').toLowerCase();
  const defaultLang = acceptLang.startsWith('ru') ? 'ru' : (acceptLang.startsWith('en') ? 'en' : (acceptLang.includes('az') ? 'az' : 'az'));

  const host = event.headers['x-forwarded-host'] || event.headers.host || 'qrprofilcard.netlify.app';
  const fullProfileUrl = `https://${host}/p/${slug}`;

  // Bu QR Profile Card məhsulunun özünü reklam edən kiçik bölmə — admin əlaqə nömrəsi env-dən gəlir
  const adminPhone = process.env.ADMIN_CONTACT_PHONE || '';
  const adminPhoneDigits = adminPhone.replace(/[^\d+]/g, '');
  const promoBlock = adminPhone ? `
    <a class="promo-card reveal" href="https://wa.me/${esc(adminPhoneDigits.replace('+', ''))}?text=${encodeURIComponent('Salam, mən də QR Profile Card istəyirəm')}" target="_blank" rel="noopener">
      <div class="promo-icon">🔗</div>
      <div class="promo-text">
        <div class="promo-title">Siz də belə profil istəyirsiniz?</div>
        <div class="promo-sub">Bizimlə əlaqə saxlayın: ${esc(adminPhone)}</div>
      </div>
      <div class="promo-arrow">→</div>
    </a>` : '';

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
    (bioI18n.az || bioI18n.en || bioI18n.ru) ? `NOTE:${pickLang(bioI18n, defaultLang).replace(/\n/g, ' ')}` : '',
    'END:VCARD'
  ].filter(Boolean).join('\n');
  const vcardDataUri = 'data:text/vcard;charset=utf-8,' + encodeURIComponent(vcardLines);
  const vcardBlock = `
    <a class="vcard-btn reveal" href="${vcardDataUri}" download="${esc((license.owner_name || 'kontakt').replace(/\s+/g, '_'))}.vcf">
      <span data-i18n="save_contact">📇 Kontaktı yadda saxla</span>
    </a>`;

  // Digər profil / biznes keçidi
  const otherProfileBlock = (d.otherProfile && d.otherProfile.url) ? `
    <a class="other-profile-btn reveal" href="${esc(d.otherProfile.url)}" target="_blank" rel="noopener">
      <span${d.otherProfile.label ? '' : ' data-i18n="other_profile"'}>${esc(d.otherProfile.label || 'Digər profilimə bax')}</span>
      <span class="arrow-circle">→</span>
    </a>` : '';

  // İş saatları (klient tərəfdə Bakı vaxtı ilə hesablanacaq)
  const hoursBlock = (d.hours && d.hours.days && d.hours.days.length) ? `
    <div class="hours-badge reveal" id="hoursBadge" data-days="${(d.hours.days || []).join(',')}" data-open="${esc(d.hours.open || '')}" data-close="${esc(d.hours.close || '')}">
      <span id="hoursDot">●</span> <span id="hoursText" data-i18n="checking">Yoxlanılır...</span>
    </div>` : '';

  const allLinks = d.links || [];

  // Sosial-media tərzi statistika zolağı: baxış / keçid / albom sayı
  const albumsCountRaw = (d.albums || []).filter(a => a.items && a.items.length).length;
  const statBarHtml = `
    <div class="stat-bar reveal">
      <div class="sb-item"><b>${newViews}</b><span data-i18n="views">baxış</span></div>
      <div class="sb-item"><b>${allLinks.length}</b><span data-i18n="links_count">keçid</span></div>
      ${albumsCountRaw ? `<div class="sb-item"><b>${albumsCountRaw}</b><span data-i18n="albums_count">albom</span></div>` : ''}
    </div>`;

  // Təsdiqlənmiş profil nişanı (profile_data.verified = true olduqda göstərilir)
  const verifiedBadgeHtml = d.verified ? `
    <svg class="verified-badge" viewBox="0 0 24 24" fill="none" title="Təsdiqlənmiş profil">
      <path d="M12 2l2.4 2.2 3.2-.6 1 3.1 3.1 1-.6 3.2L23.3 13l-2.2 2.4.6 3.2-3.1 1-1 3.1-3.2-.6L12 24l-2.4-2.2-3.2.6-1-3.1-3.1-1 .6-3.2L0.7 13l2.2-2.4-.6-3.2 3.1-1 1-3.1 3.2.6L12 2z" fill="#1458c4"/>
      <path d="M8.5 12.3l2.4 2.4 4.6-4.9" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>` : '';

  // Fəaliyyət sahələri seçici (bir neçə fərqli biznesi olan istifadəçilər üçün)
  const categories = d.categories || [];
  const categoryTabsHtml = categories.length ? `
    <div class="cat-tabs reveal" id="catTabs">
      <button class="cat-tab active" data-cat="" data-i18n="all">Hamısı</button>
      ${categories.map(c => `<button class="cat-tab" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
    </div>` : '';

  // Xəritəsi olan ünvan linkini ayrıca (böyük xəritə kartı kimi) göstəririk
  const mapLocationLink = allLinks.find(l => l.type === 'location' && l.lat && l.lng);

  // Sosial şəbəkələr — 2 sütunlu düymə şəbəkəsi (xəritəli ünvan buraya düşmür, ayrıca kart kimi göstərilir)
  const links = allLinks.filter(l => l !== mapLocationLink).map((l, idx) => {
    let href = esc(l.url);
    if (l.type === 'phone') href = `tel:${esc((l.url || '').replace(/[^\d+]/g, ''))}`;
    if (l.type === 'email') href = `mailto:${esc(l.url || '')}`;
    if (l.type === 'location') href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.url || '')}`;
    return `
    <a class="link-tile reveal" data-cat="${esc(l.category || '')}" style="transition-delay:${Math.min(idx * 50, 400)}ms" href="${href}" target="_blank" rel="noopener">
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
  const hasAbout = !!(aboutI18n.az || aboutI18n.en || aboutI18n.ru || d.aboutPhoto || stats.length);
  const aboutPhotoImg = d.aboutPhoto || d.avatar;
  const statsHtml = stats.map(s => `
    <div class="stat-item reveal">
      <div class="stat-number">${esc(s.number)}</div>
      <div class="stat-label">${esc(s.label)}</div>
    </div>`).join('');
  const aboutHtml = hasAbout ? `
    <div class="about-section">
      <div class="about-title reveal" data-i18n="about_title">ÖZ HAQQIMDA</div>
      <div class="about-flex">
        ${aboutPhotoImg ? `<div class="about-photo reveal"><img src="${esc(aboutPhotoImg)}" loading="lazy"></div>` : ''}
        ${statsHtml ? `<div class="stats-col">${statsHtml}</div>` : ''}
      </div>
      ${(aboutI18n.az || aboutI18n.en || aboutI18n.ru) ? `<div class="about-text reveal" id="aboutTextEl"${pickLang(aboutI18n, defaultLang) ? '' : ' style="display:none;"'}>${esc(pickLang(aboutI18n, defaultLang))}</div>` : ''}
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
    <div class="album-section" data-cat="${esc(album.category || '')}">
      <div class="album-title reveal">${esc(album.name)}</div>
      <div class="media-grid">${items}</div>
    </div>`;
  }).join('');

  // Sertifikatlar / nailiyyətlər
  const certificates = d.certificates || [];
  const certHtml = certificates.length ? `
    <div class="cert-section">
      <div class="cert-title reveal">🏆 <span data-i18n="certificates">SERTİFİKATLAR</span></div>
      <div class="cert-strip">
        ${certificates.map((c, idx) => `
          <div class="cert-badge reveal" style="transition-delay:${Math.min(idx * 50, 300)}ms" onclick="openLightbox('${esc(c.url)}','image')">
            <img src="${esc(c.url)}" loading="lazy">
          </div>`).join('')}
      </div>
    </div>` : '';

  // Diplomlar (sertifikatlardan ayrı bölmə)
  const diplomas = d.diplomas || [];
  const diplomaHtml = diplomas.length ? `
    <div class="cert-section">
      <div class="cert-title reveal">🎓 <span data-i18n="diplomas">DİPLOMLAR</span></div>
      <div class="cert-strip">
        ${diplomas.map((c, idx) => `
          <div class="cert-badge reveal" style="transition-delay:${Math.min(idx * 50, 300)}ms" onclick="openLightbox('${esc(c.url)}','image')">
            <img src="${esc(c.url)}" loading="lazy">
          </div>`).join('')}
      </div>
    </div>` : '';

  // Müştəri rəyləri
  const testimonials = (d.testimonials || []).filter(t => t.text);
  const testimonialsHtml = testimonials.length ? `
    <div class="testimonials-section">
      <div class="testimonials-title reveal">💬 <span data-i18n="testimonials">MÜŞTƏRİ RƏYLƏRİ</span></div>
      ${testimonials.map((t) => `
        <div class="testimonial-card reveal">
          <div class="testimonial-stars">${'⭐'.repeat(t.stars || 5)}</div>
          <div class="testimonial-text">"${esc(t.text)}"</div>
          ${t.name ? `<div class="testimonial-name">— ${esc(t.name)}</div>` : ''}
        </div>`).join('')}
    </div>` : '';

  const html = `<!DOCTYPE html>
<html lang="${defaultLang}"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(license.owner_name || 'Profil')}</title>
<meta name="theme-color" content="#f5f8fd">
<link rel="manifest" href="/.netlify/functions/site-manifest?slug=${encodeURIComponent(slug)}">
${d.avatar ? `<link rel="apple-touch-icon" href="${esc(d.avatar)}">
<link rel="icon" href="${esc(d.avatar)}">` : ''}
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="${esc(license.owner_name || 'Profil')}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&display=swap" rel="stylesheet">
      <!-- QR kitabxanası burada YÜKLƏNMİR — yalnız "QR göstər" düyməsinə basılanda lazy-load olunur (aşağıda openQrModal-a bax). Bu, hər profil açılışında lazımsız bir HTTP sorğusunun və skript icrasının qarşısını alır. -->
<style>
  * { box-sizing: border-box; margin:0; padding:0; -webkit-tap-highlight-color: transparent; }
  html { scroll-behavior:smooth; }
  :root{
    --navy:#0b2545; --blue:#1458c4; --blue-dark:#0f4499; --blue-tint:#eaf1fc; --tint2:#f5f8fd;
    --paper:#ffffff; --ink:#101a2b; --muted:#5b6b85; --line:#e2e8f3; --gold:#c9982e;
  }
  body {
    font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
    background:
      radial-gradient(circle at 50% -10%, #eaf1fc 0%, #f5f8fd 55%),
      repeating-linear-gradient(0deg, rgba(11,37,69,.025) 0px, rgba(11,37,69,.025) 1px, transparent 1px, transparent 42px),
      repeating-linear-gradient(90deg, rgba(11,37,69,.025) 0px, rgba(11,37,69,.025) 1px, transparent 1px, transparent 42px);
    background-color:#f5f8fd;
    min-height:100vh; padding:28px 20px 50px; display:flex; justify-content:center;
  }
  .page { width:100%; max-width:440px; animation: fadeUp .6s ease both; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px);} to { opacity:1; transform:translateY(0);} }
  @keyframes pop { 0%{transform:scale(.9);opacity:0;} 100%{transform:scale(1);opacity:1;} }
  @keyframes ringPulse { 0%,100%{box-shadow:0 0 0 0 rgba(20,88,196,.28);} 50%{box-shadow:0 0 0 10px rgba(20,88,196,0);} }

  .cover { position:relative; width:100%; height:280px; border-radius:28px; overflow:hidden; margin-bottom:20px; box-shadow:0 20px 40px -22px rgba(11,37,69,.28); }
  .cover-img { width:100%; height:100%; object-fit:cover; display:block; transform:scale(1.02); will-change:transform; }
  .cover-fade { position:absolute; left:0; right:0; bottom:0; height:110px; background:linear-gradient(to bottom, rgba(245,248,253,0) 0%, rgba(245,248,253,.85) 100%); }

  .reveal { opacity:0; transform:translateY(18px); transition:opacity .55s ease, transform .55s ease; }
  .reveal.in { opacity:1; transform:translateY(0); }

  .top { text-align:center; margin-bottom:14px; }
  .avatar-wrap { position:relative; width:140px; height:140px; margin:0 auto 18px; animation: pop .5s ease .05s both; }
  .avatar {
    width:140px; height:140px; border-radius:50%; overflow:hidden;
    background:linear-gradient(135deg,var(--blue),var(--navy)); display:flex; align-items:center; justify-content:center;
    color:#fff; font-size:48px; font-weight:700; border:4px solid #fff;
    box-shadow:0 10px 26px rgba(20,88,196,.28);
    animation: ringPulse 2.6s ease-in-out infinite;
  }

  h1 {
    font-family:'Baloo 2', -apple-system, sans-serif; font-size:27px; color:var(--navy); font-weight:800;
    letter-spacing:.3px; margin-bottom:6px; display:inline-flex; align-items:center; gap:7px; justify-content:center;
  }
  .verified-badge{ width:19px; height:19px; flex-shrink:0; }
  .bio { color:var(--muted); font-size:14px; line-height:1.55; white-space:pre-wrap; max-width:340px; margin:0 auto; }

  .stat-bar { display:flex; justify-content:center; gap:26px; margin:14px auto 4px; }
  .stat-bar .sb-item { text-align:center; }
  .stat-bar b { display:block; font-size:16px; color:var(--navy); font-weight:800; line-height:1.1; }
  .stat-bar span { font-size:10.5px; color:var(--muted); font-weight:600; }

  .ibadge { border-radius:50%; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }

  .phone-row { display:flex; gap:10px; margin-bottom:20px; align-items:center; }
  .phone-btn {
    flex:1; display:flex; align-items:center; justify-content:center; gap:10px;
    background:linear-gradient(135deg,var(--blue),var(--navy)); color:#fff; text-decoration:none;
    font-weight:700; font-size:15px; padding:12px 16px; border-radius:16px;
    box-shadow:0 10px 24px rgba(20,88,196,.3);
  }
  .phone-icon-btn {
    width:52px; height:52px; flex-shrink:0; display:flex; align-items:center; justify-content:center;
    background:var(--blue-tint); border:1px solid var(--line); border-radius:16px;
    text-decoration:none;
  }

  .links-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:8px; }
  .link-tile {
    display:flex; align-items:center; gap:10px; background:var(--paper);
    border:1px solid var(--line); border-radius:16px; padding:13px 14px;
    text-decoration:none; color:var(--ink); font-weight:600; font-size:13.5px; transition:.15s;
    box-shadow:0 1px 2px rgba(11,37,69,.04);
  }
  .link-tile:active { background:var(--blue-tint); border-color:var(--blue); transform:scale(.97); }
  .link-tile .label { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

  .vcard-btn {
    display:flex; align-items:center; justify-content:center; gap:8px; width:100%;
    background:var(--paper); border:1px solid var(--line); border-radius:15px;
    padding:13px; color:var(--navy); font-weight:700; font-size:14px; text-decoration:none; margin-bottom:14px;
    box-shadow:0 1px 2px rgba(11,37,69,.04);
  }
  .vcard-btn:active { background:var(--blue-tint); }

  .other-profile-btn {
    display:flex; align-items:center; justify-content:space-between; width:100%;
    background:linear-gradient(135deg,var(--blue-tint),#eef4ff);
    border:1px solid var(--blue); border-radius:16px; padding:15px 18px;
    color:var(--navy); font-weight:700; font-size:14px; text-decoration:none; margin-bottom:16px;
  }
  .arrow-circle {
    width:28px; height:28px; border-radius:50%; background:var(--blue); color:#fff;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }

  .cat-tabs { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-bottom:18px; }
  .cat-tab {
    flex-shrink:0; background:var(--paper); border:1px solid var(--line); color:var(--muted);
    padding:9px 16px; border-radius:20px; font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap;
  }
  .cat-tab.active { background:linear-gradient(135deg,var(--blue),var(--navy)); border-color:transparent; color:#fff; }

  .hours-badge {
    display:inline-flex; align-items:center; gap:7px; background:var(--paper);
    border:1px solid var(--line); border-radius:20px; padding:8px 16px; font-size:12.5px;
    color:var(--muted); margin:0 auto 18px; width:fit-content; font-weight:600;
  }
  .hours-badge.open #hoursDot { color:#16a34a; }
  .hours-badge.closed #hoursDot { color:#dc2626; }

  .map-card { display:block; text-decoration:none; margin-bottom:16px; border-radius:18px; overflow:hidden; border:1px solid var(--line); }
  .map-card iframe { width:100%; height:160px; border:none; display:block; filter:grayscale(.1) contrast(1.02); pointer-events:none; }
  .map-card-label { background:var(--paper); color:var(--muted); font-size:12.5px; padding:10px 14px; font-weight:600; }

  .cert-section { margin-top:28px; }
  .cert-title { font-size:14px; font-weight:700; color:var(--navy); letter-spacing:1px; margin-bottom:12px; text-align:center; }
  .cert-strip { display:flex; gap:10px; overflow-x:auto; padding-bottom:6px; }
  .cert-badge {
    flex:0 0 90px; height:110px; border-radius:12px; overflow:hidden; cursor:pointer;
    border:2px solid var(--line); box-shadow:0 8px 18px rgba(11,37,69,.12);
  }
  .cert-badge img { width:100%; height:100%; object-fit:cover; }

  .testimonials-section { margin-top:28px; }
  .testimonials-title { font-size:14px; font-weight:700; color:var(--navy); letter-spacing:1px; margin-bottom:14px; text-align:center; }
  .testimonial-card {
    background:var(--paper); border:1px solid var(--line); border-radius:16px;
    padding:16px 18px; margin-bottom:12px; box-shadow:0 1px 2px rgba(11,37,69,.04);
  }
  .testimonial-stars { font-size:13px; margin-bottom:8px; }
  .testimonial-text { color:var(--ink); font-size:13.5px; line-height:1.55; font-style:italic; }
  .testimonial-name { color:var(--muted); font-size:12.5px; margin-top:8px; text-align:right; }

  .about-section { margin-top:30px; }
  .about-title {
    font-family:'Baloo 2', -apple-system, sans-serif; font-weight:800; font-size:21px; color:var(--navy);
    text-align:center; margin-bottom:18px; letter-spacing:.5px;
  }
  .about-flex { display:flex; gap:16px; align-items:stretch; margin-bottom:16px; }
  .about-photo { width:38%; flex-shrink:0; border-radius:20px; overflow:hidden; box-shadow:0 16px 34px rgba(11,37,69,.18); aspect-ratio:3/4; }
  .about-photo img { width:100%; height:100%; object-fit:cover; display:block; }
  .stats-col { flex:1; display:flex; flex-direction:column; justify-content:center; gap:16px; }
  .stat-number { font-family:'Baloo 2', -apple-system, sans-serif; font-weight:800; font-size:28px; color:var(--blue); line-height:1; }
  .stat-label { font-size:12px; color:var(--muted); margin-top:3px; }
  .about-text { color:var(--muted); font-size:13.5px; line-height:1.65; white-space:pre-wrap; }

  .footer { margin-top:30px; text-align:center; font-size:10.5px; letter-spacing:2px; color:#9fb0cc; font-weight:700; }

  .album-section { margin-top:26px; }
  .album-title { color:var(--navy); font-weight:700; font-size:15px; margin-bottom:10px; padding-left:2px; }
  .media-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
  .media-cell {
    position:relative; aspect-ratio:1; border-radius:14px; overflow:hidden; cursor:pointer;
    background:var(--blue-tint); border:1px solid var(--line);
  }
  .media-cell img, .media-cell video { width:100%; height:100%; object-fit:cover; display:block; }
  .play-icon {
    position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
    width:34px; height:34px; background:rgba(11,37,69,.6); color:#fff; border-radius:50%;
    display:flex; align-items:center; justify-content:center; font-size:13px;
  }

  .contact-section {
    margin-top:32px; background:var(--paper); border:1px solid var(--line);
    border-radius:22px; padding:24px 20px; box-shadow:0 20px 44px -28px rgba(11,37,69,.22);
  }
  .contact-title { font-family:'Baloo 2', -apple-system, sans-serif; font-weight:800; font-size:21px; color:var(--navy); margin-bottom:6px; text-align:center; }
  .contact-sub { font-size:12.5px; color:var(--muted); margin-bottom:18px; text-align:center; line-height:1.5; }
  .contact-input, .contact-textarea {
    width:100%; background:var(--tint2); border:1px solid var(--line); border-radius:13px;
    padding:13px 15px; color:var(--ink); font-size:14px; margin-bottom:11px; font-family:inherit; outline:none;
  }
  .contact-input:focus, .contact-textarea:focus { border-color:var(--blue); background:#fff; }
  .contact-textarea { resize:vertical; min-height:90px; }
  .contact-submit {
    width:100%; background:linear-gradient(135deg,var(--blue),var(--navy)); color:#fff; border:none;
    padding:14px; border-radius:13px; font-weight:700; font-size:15px; cursor:pointer;
    box-shadow:0 10px 24px rgba(20,88,196,.3);
  }
  .contact-submit:active { transform:scale(.98); }
  .contact-feedback { margin-top:12px; font-size:13px; text-align:center; min-height:18px; }

  .share-row { display:flex; gap:10px; margin-top:24px; align-items:center; }
  .share-btn {
    flex:1; background:var(--paper); border:1px solid var(--line); border-radius:15px;
    padding:13px; color:var(--navy); font-weight:700; font-size:13.5px; cursor:pointer;
  }
  .share-icon-btn {
    width:48px; height:48px; flex-shrink:0; display:flex; align-items:center; justify-content:center;
    background:var(--paper); border:1px solid var(--line); border-radius:15px; text-decoration:none; cursor:pointer;
  }

  .qr-modal {
    display:none; position:fixed; inset:0; background:rgba(11,37,69,.55); z-index:998;
    align-items:center; justify-content:center; padding:24px; backdrop-filter:blur(2px);
  }
  .qr-modal.open { display:flex; }
  .qr-modal-box { background:#fff; border-radius:20px; padding:26px; text-align:center; max-width:280px; width:100%; box-shadow:0 30px 60px -20px rgba(11,37,69,.5); }
  .qr-modal-box h4 { color:var(--navy); margin-bottom:14px; font-size:15px; }
  .qr-modal-box p { color:var(--muted); font-size:12px; margin-top:12px; }
  #qrCanvasWrap { display:flex; justify-content:center; margin-bottom:6px; }
  .qr-modal-close { margin-top:10px; background:var(--blue-tint); color:var(--navy); border:none; border-radius:10px; padding:10px 18px; font-weight:700; cursor:pointer; font-size:13px; }

  .promo-card {
    display:flex; align-items:center; gap:14px; margin-top:26px; padding:16px 18px;
    background:linear-gradient(135deg,var(--blue-tint),#eef8f0);
    border:1px dashed var(--blue); border-radius:18px; text-decoration:none;
  }
  .promo-icon { font-size:24px; flex-shrink:0; }
  .promo-text { flex:1; }
  .promo-title { color:var(--navy); font-weight:700; font-size:13.5px; margin-bottom:2px; }
  .promo-sub { color:var(--muted); font-size:12px; }
  .promo-arrow { color:var(--blue); font-size:16px; flex-shrink:0; }

  .lang-switch { position:fixed; top:16px; right:16px; z-index:60; display:flex; gap:2px; background:#fff; border:1px solid var(--line); border-radius:10px; padding:3px; box-shadow:0 8px 20px -8px rgba(11,37,69,.3); }
  .lang-pill { border:none; background:transparent; color:var(--muted); font-size:11.5px; font-weight:800; padding:6px 8px; border-radius:7px; cursor:pointer; font-family:inherit; letter-spacing:.3px; }
  .lang-pill.active { background:var(--navy); color:#fff; }

  .lightbox {
    display:none; position:fixed; inset:0; background:rgba(11,37,69,.92); z-index:999;
    align-items:center; justify-content:center; padding:24px;
  }
  .lightbox.open { display:flex; }
  .lightbox img, .lightbox video { max-width:100%; max-height:90vh; border-radius:14px; }
  .lightbox-close {
    position:absolute; top:20px; right:20px; width:42px; height:42px; border-radius:50%;
    background:rgba(255,255,255,.18); color:#fff; border:none; font-size:20px; cursor:pointer;
  }
</style></head>
<body>
  <div class="page">
    ${coverHtml}
    <div class="top">
      ${fallbackAvatarHtml}
      <h1>${esc(license.owner_name || '')}${verifiedBadgeHtml}</h1>
      ${(bioI18n.az || bioI18n.en || bioI18n.ru) ? `<div class="bio" id="bioEl"${pickLang(bioI18n, defaultLang) ? '' : ' style="display:none;"'}>${esc(pickLang(bioI18n, defaultLang))}</div>` : ''}
      ${statBarHtml}
    </div>
    ${categoryTabsHtml}
    ${hoursBlock ? `<div style="text-align:center;">${hoursBlock}</div>` : ''}
    ${vcardBlock}
    ${otherProfileBlock}
    ${phoneBlock}
    ${mapHtml}
    <div class="links-grid">${links || ''}</div>
    ${aboutHtml}
    ${certHtml}
    ${diplomaHtml}
    ${testimonialsHtml}
    ${albumsHtml}

    <div class="contact-section reveal">
      <div class="contact-title" data-i18n="contact_title">Mənimlə əlaqə et</div>
      <div class="contact-sub" data-i18n="contact_sub">Sual və ya təklifinizi qeyd edə bilərsiniz. Sizə ən qısa zamanda cavab verək.</div>
      <input type="text" id="cName" class="contact-input" placeholder="Adınız" data-i18n-placeholder="ph_name">
      <input type="email" id="cEmail" class="contact-input" placeholder="E-poçt ünvanınız" data-i18n-placeholder="ph_email">
      <textarea id="cMsg" class="contact-textarea" placeholder="Mesajınızı yazın" data-i18n-placeholder="ph_message"></textarea>
      <button class="contact-submit" onclick="submitContact()" data-i18n="send">Göndər</button>
      <div class="contact-feedback" id="contactFeedback"></div>
    </div>

    <div class="share-row reveal">
      <button class="share-btn" onclick="shareProfile()">📤 <span data-i18n="share_profile">Bu profili paylaş</span></button>
      <button class="share-icon-btn" onclick="openQrModal()" title="QR kodunu göstər" data-i18n-title="show_qr">▦</button>
      <a class="share-icon-btn" href="https://wa.me/?text=${encodeURIComponent((license.owner_name || 'Bu profilə bax') + ': ' + fullProfileUrl)}" target="_blank" rel="noopener" title="WhatsApp-da paylaş">${iconBadge('whatsapp', 30)}</a>
      <a class="share-icon-btn" href="https://t.me/share/url?url=${encodeURIComponent(fullProfileUrl)}&text=${encodeURIComponent(license.owner_name || '')}" target="_blank" rel="noopener" title="Telegram-da paylaş">${iconBadge('telegram', 30)}</a>
    </div>

    ${promoBlock}

    <div class="footer">QR PROFILE CARD</div>
  </div>

  <div class="lang-switch" id="langSwitch">
    <button class="lang-pill" data-lang="az">AZ</button>
    <button class="lang-pill" data-lang="en">EN</button>
    <button class="lang-pill" data-lang="ru">RU</button>
  </div>

  <div class="qr-modal" id="qrModal" onclick="closeQrModal(event)">
    <div class="qr-modal-box" onclick="event.stopPropagation()">
      <h4 data-i18n="qr_modal_title">Profilin QR kodu</h4>
      <div id="qrCanvasWrap"></div>
      <p data-i18n="qr_modal_sub">Ekranı göstərərək başqasının telefonuna skan etdir</p>
      <button class="qr-modal-close" onclick="closeQrModal(event)" data-i18n="close">Bağla</button>
    </div>
  </div>

  <div class="lightbox" id="lightbox" onclick="closeLightbox(event)">
    <button class="lightbox-close" onclick="closeLightbox(event)">✕</button>
    <div id="lightboxContent"></div>
  </div>

  <script>
    const PROFILE_SLUG = ${JSON.stringify(slug)};
    const PROFILE_URL = ${JSON.stringify(fullProfileUrl)};
    const OWNER_NAME = ${JSON.stringify(license.owner_name || 'Profil')};
    const CONTENT_I18N = { bio: ${JSON.stringify(bioI18n)}, about: ${JSON.stringify(aboutI18n)} };

    // ==================== I18N (ictimai profil) ====================
    const I18N = {
      az: {
        all: 'Hamısı', about_title: 'ÖZ HAQQIMDA', certificates: 'SERTİFİKATLAR', diplomas: 'DİPLOMLAR', testimonials: 'MÜŞTƏRİ RƏYLƏRİ',
        views: 'baxış', links_count: 'keçid', albums_count: 'albom', checking: 'Yoxlanılır...', open_now: 'Hazırda açıqdır', closed_now: 'Hazırda bağlıdır',
        save_contact: '📇 Kontaktı yadda saxla', other_profile: 'Digər profilimə bax',
        contact_title: 'Mənimlə əlaqə et', contact_sub: 'Sual və ya təklifinizi qeyd edə bilərsiniz. Sizə ən qısa zamanda cavab verək.',
        ph_name: 'Adınız', ph_email: 'E-poçt ünvanınız', ph_message: 'Mesajınızı yazın', send: 'Göndər',
        share_profile: 'Bu profili paylaş', show_qr: 'QR kodunu göstər',
        qr_modal_title: 'Profilin QR kodu', qr_modal_sub: 'Ekranı göstərərək başqasının telefonuna skan etdir', close: 'Bağla',
        err_name_message: 'Zəhmət olmasa ad və mesaj yazın.', sending: 'Göndərilir...',
        msg_sent: '✅ Mesajınız göndərildi! Tezliklə sizinlə əlaqə saxlanılacaq.',
        msg_saved_no_email: '⚠️ Mesajınız qeydə alındı, amma email göndərilə bilmədi. Zəhmət olmasa telefonla əlaqə saxlayın.',
        err_generic: 'Xəta baş verdi, bir az sonra cəhd edin.', err_network: 'Şəbəkə xətası.',
        link_copied: 'Link kopyalandı: ', copy_link: 'Linki kopyala:'
      },
      en: {
        all: 'All', about_title: 'ABOUT ME', certificates: 'CERTIFICATES', diplomas: 'DIPLOMAS', testimonials: 'TESTIMONIALS',
        views: 'views', links_count: 'links', albums_count: 'albums', checking: 'Checking...', open_now: 'Open now', closed_now: 'Closed now',
        save_contact: '📇 Save contact', other_profile: 'See my other profile',
        contact_title: 'Get in touch', contact_sub: 'Leave your question or suggestion, we\\u2019ll get back to you shortly.',
        ph_name: 'Your name', ph_email: 'Your email', ph_message: 'Your message', send: 'Send',
        share_profile: 'Share this profile', show_qr: 'Show QR code',
        qr_modal_title: 'Profile QR code', qr_modal_sub: 'Show the screen so someone can scan it with their phone', close: 'Close',
        err_name_message: 'Please enter your name and message.', sending: 'Sending...',
        msg_sent: '✅ Your message has been sent! We will get back to you shortly.',
        msg_saved_no_email: '⚠️ Your message was saved, but the email could not be sent. Please contact by phone instead.',
        err_generic: 'Something went wrong, please try again shortly.', err_network: 'Network error.',
        link_copied: 'Link copied: ', copy_link: 'Copy link:'
      },
      ru: {
        all: 'Все', about_title: 'ОБО МНЕ', certificates: 'СЕРТИФИКАТЫ', diplomas: 'ДИПЛОМЫ', testimonials: 'ОТЗЫВЫ КЛИЕНТОВ',
        views: 'просмотров', links_count: 'ссылок', albums_count: 'альбомов', checking: 'Проверка...', open_now: 'Сейчас открыто', closed_now: 'Сейчас закрыто',
        save_contact: '📇 Сохранить контакт', other_profile: 'Смотреть другой мой профиль',
        contact_title: 'Связаться со мной', contact_sub: 'Оставьте свой вопрос или предложение, мы ответим в ближайшее время.',
        ph_name: 'Ваше имя', ph_email: 'Ваш email', ph_message: 'Ваше сообщение', send: 'Отправить',
        share_profile: 'Поделиться профилем', show_qr: 'Показать QR-код',
        qr_modal_title: 'QR-код профиля', qr_modal_sub: 'Покажи экран, чтобы кто-то отсканировал его телефоном', close: 'Закрыть',
        err_name_message: 'Пожалуйста, введите имя и сообщение.', sending: 'Отправка...',
        msg_sent: '✅ Ваше сообщение отправлено! Мы скоро свяжемся с вами.',
        msg_saved_no_email: '⚠️ Сообщение сохранено, но email не отправлен. Пожалуйста, свяжитесь по телефону.',
        err_generic: 'Произошла ошибка, попробуйте чуть позже.', err_network: 'Ошибка сети.',
        link_copied: 'Ссылка скопирована: ', copy_link: 'Скопируй ссылку:'
      }
    };

    function detectLang() {
      const saved = localStorage.getItem('qrlang');
      if (saved && I18N[saved]) return saved;
      return ${JSON.stringify(defaultLang)};
    }
    let currentLang = detectLang();

    function applyLang(lang) {
      currentLang = lang;
      localStorage.setItem('qrlang', lang);
      document.documentElement.lang = lang;
      const dict = I18N[lang];
      document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        if (dict[key] !== undefined) el.textContent = dict[key];
      });
      document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (dict[key] !== undefined) el.setAttribute('placeholder', dict[key]);
      });
      document.querySelectorAll('[data-i18n-title]').forEach((el) => {
        const key = el.getAttribute('data-i18n-title');
        if (dict[key] !== undefined) el.setAttribute('title', dict[key]);
      });
      // Bio / Haqqımda mətnini seçilmiş dildə göstər (owner o dildə yazmayıbsa, AZ-a qayıdır)
      const bioEl = document.getElementById('bioEl');
      if (bioEl) {
        const txt = CONTENT_I18N.bio[lang] || CONTENT_I18N.bio.az || CONTENT_I18N.bio.en || CONTENT_I18N.bio.ru || '';
        bioEl.textContent = txt;
        bioEl.style.display = txt ? '' : 'none';
      }
      const aboutEl = document.getElementById('aboutTextEl');
      if (aboutEl) {
        const txt = CONTENT_I18N.about[lang] || CONTENT_I18N.about.az || CONTENT_I18N.about.en || CONTENT_I18N.about.ru || '';
        aboutEl.textContent = txt;
        aboutEl.style.display = txt ? '' : 'none';
      }
      // İş saatları statusunu yeni dildə yenidən yaz
      const hoursBadge = document.getElementById('hoursBadge');
      if (hoursBadge && hoursBadge.dataset.openState !== undefined) {
        document.getElementById('hoursText').textContent = hoursBadge.dataset.openState === '1' ? dict.open_now : dict.closed_now;
      }
      document.querySelectorAll('#langSwitch .lang-pill').forEach((b) => b.classList.toggle('active', b.dataset.lang === lang));
    }
    document.querySelectorAll('#langSwitch .lang-pill').forEach((b) => b.addEventListener('click', () => applyLang(b.dataset.lang)));
    // ================== /I18N ==================

    async function shareProfile() {
      if (navigator.share) {
        try { await navigator.share({ title: OWNER_NAME, url: PROFILE_URL }); return; } catch (e) {}
      }
      try {
        await navigator.clipboard.writeText(PROFILE_URL);
        alert(I18N[currentLang].link_copied + PROFILE_URL);
      } catch (e) {
        prompt(I18N[currentLang].copy_link, PROFILE_URL);
      }
    }

    let qrRendered = false;
    let qrLibLoading = null;
    function loadQrLib() {
      if (window.QRCode) return Promise.resolve();
      if (qrLibLoading) return qrLibLoading;
      qrLibLoading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      return qrLibLoading;
    }
    async function openQrModal() {
      document.getElementById('qrModal').classList.add('open');
      if (!qrRendered) {
        const wrap = document.getElementById('qrCanvasWrap');
        wrap.innerHTML = '<div style="padding:30px;color:#8a97ad;font-size:13px;">Yüklənir...</div>';
        try {
          await loadQrLib();
          wrap.innerHTML = '';
          new QRCode(wrap, { text: PROFILE_URL, width: 200, height: 200, colorDark: '#0b2545', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
          qrRendered = true;
        } catch (e) {
          wrap.innerHTML = '<div style="padding:30px;color:#8a97ad;font-size:13px;">QR kod yüklənə bilmədi.</div>';
        }
      }
    }
    function closeQrModal(e) {
      document.getElementById('qrModal').classList.remove('open');
    }

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
      const t = I18N[currentLang];
      if (!name || !message) {
        feedback.style.color = '#ef4444';
        feedback.textContent = t.err_name_message;
        return;
      }
      feedback.style.color = '#9aa8ca';
      feedback.textContent = t.sending;
      try {
        const r = await fetch('/.netlify/functions/contact-submit', {
          method: 'POST',
          body: JSON.stringify({ slug: PROFILE_SLUG, name, email, message })
        });
        const j = await r.json();
        if (j.success && j.emailSent) {
          feedback.style.color = '#22c55e';
          feedback.textContent = t.msg_sent;
          document.getElementById('cName').value = '';
          document.getElementById('cEmail').value = '';
          document.getElementById('cMsg').value = '';
        } else if (j.success && !j.emailSent) {
          feedback.style.color = '#f59e0b';
          feedback.textContent = t.msg_saved_no_email;
        } else {
          feedback.style.color = '#ef4444';
          feedback.textContent = t.err_generic;
        }
      } catch (e) {
        feedback.style.color = '#ef4444';
        feedback.textContent = t.err_network;
      }
    }

    // Scroll ilə görünən elementlərin canlanması
    // Fəaliyyət sahəsi filtri
    const catTabs = document.getElementById('catTabs');
    if (catTabs) {
      catTabs.querySelectorAll('.cat-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          catTabs.querySelectorAll('.cat-tab').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          const selected = btn.dataset.cat;
          document.querySelectorAll('[data-cat]').forEach((el) => {
            const elCat = el.dataset.cat;
            const show = !selected || !elCat || elCat === selected;
            el.style.display = show ? '' : 'none';
          });
        });
      });
    }

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
        hoursBadge.dataset.openState = isOpen ? '1' : '0';
        document.getElementById('hoursText').textContent = isOpen
          ? I18N[currentLang].open_now
          : I18N[currentLang].closed_now;
      } catch (e) {}
    }

    applyLang(currentLang);

    // "Kim baxıb" qeydi — səhifə artıq göstərildikdən SONRA, fon rejimində göndərilir.
    // Bu sorğu bəzən (yeni ziyarətçilərdə, IP-dən şəhər axtarışı ucbatından) 1 saniyəyə
    // qədər çəkə bilər, amma istifadəçi bunu HEÇ hiss etmir — səhifə artıq tam açılıb.
    fetch('/.netlify/functions/log-profile-view', {
      method: 'POST',
      body: JSON.stringify({ slug: PROFILE_SLUG })
    }).catch(() => {});
  </script>
</body></html>`;

  return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html };
};
