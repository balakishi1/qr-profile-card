// Bu, ADİ (pulsuz Netlify planında da işləyən) bir funksiyadır — "Background Function"
// DEYİL. Sürət qazancı bu funksiyanın özündən yox, ONU ÇAĞIRMA ÜSULUNDAN gəlir:
// profile.js səhifəni artıq tam render edib göndərdikdən SONRA, brauzerin özü
// (client-side JS) bu funksiyanı çağırır — ona görə bu sorğunun nə qədər çəkməsinin
// (geolocation bəzən ~1 saniyə çəkir) istifadəçi üçün heç bir əhəmiyyəti yoxdur,
// çünki səhifə onsuz da artıq göründüb.
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function hashIp(ip) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET || 'fallback').update(String(ip || 'unknown')).digest('hex');
}

async function geolocateIp(ip) {
  if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) return { city: null, country: null };
  try {
    const r = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city`);
    const j = await r.json();
    if (j.status === 'success') return { city: j.city || null, country: j.country || null };
  } catch (e) {}
  return { city: null, country: null };
}

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const slug = body.slug;
    if (!slug) return { statusCode: 400, body: '' };

    // IP-ni ÖZ sorğusunun header-indən götürürük (brauzer birbaşa çağırdığı üçün doğru IP budur)
    const ipRaw = ((event.headers && (event.headers['x-forwarded-for'] || event.headers['client-ip'])) || '').split(',')[0].trim();
    const ipHash = hashIp(ipRaw);

    const { data: existing } = await supabase
      .from('profile_views_log')
      .select('id, view_count')
      .eq('profile_slug', slug).eq('ip_hash', ipHash)
      .maybeSingle();

    if (existing) {
      await supabase.from('profile_views_log')
        .update({ last_viewed_at: new Date().toISOString(), view_count: (existing.view_count || 1) + 1 })
        .eq('id', existing.id);
    } else {
      const { city, country } = await geolocateIp(ipRaw);
      await supabase.from('profile_views_log').insert({ profile_slug: slug, ip_hash: ipHash, city, country });
    }
  } catch (e) {
    console.error('log-profile-view error', e);
  }
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
};
