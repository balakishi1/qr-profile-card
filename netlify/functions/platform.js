const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function esc(s) {
  return String(s || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}

function normalizeUrl(u) {
  const v = String(u || '').trim();
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) return `https://${v}`;
  return v;
}

// Rəy yazan öz QR profilinin açarını (slug) yazıbsa, oradan ad/şəkil/link çəkirik
async function lookupQrProfile(qrSlugRaw, host) {
  const slug = String(qrSlugRaw || '').trim().toLowerCase().replace(/^https?:\/\/[^/]+\/(p\/)?/i, '').replace(/[^a-z0-9-]/g, '');
  if (!slug) return null;
  const { data: lic } = await supabase
    .from('licenses')
    .select('profile_slug, profile_data, is_active')
    .eq('profile_slug', slug)
    .single();
  if (!lic || !lic.is_active) return null;
  return {
    avatarUrl: (lic.profile_data && lic.profile_data.avatar) || null,
    profileUrl: `https://${host}/p/${lic.profile_slug}`
  };
}

// Client-dən gələn kiçik (base64) şəkli 'media' bucket-ə (reviews/ qovluğu) yükləyirik
async function uploadReviewAvatar(dataUri) {
  const m = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/.exec(String(dataUri || ''));
  if (!m) return null;
  const ext = m[1] === 'image/png' ? 'png' : (m[1] === 'image/webp' ? 'webp' : 'jpg');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 900 * 1024) return null; // ~900KB limit
  const path = `reviews/${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, buf, { contentType: m[1], upsert: false });
  if (error) return null;
  const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
  return pub.publicUrl;
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

exports.handler = async (event) => {
  const action = (event.queryStringParameters && event.queryStringParameters.action) || 'stats';

  if (event.httpMethod === 'GET' && action === 'stats') {
    const { count: totalUsers } = await supabase
      .from('licenses')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: totalReviews } = await supabase
      .from('platform_reviews')
      .select('*', { count: 'exact', head: true });

    const { data: ratingRows } = await supabase.from('platform_reviews').select('rating');
    let avgRating = 0;
    if (ratingRows && ratingRows.length) {
      avgRating = ratingRows.reduce((s, r) => s + (r.rating || 0), 0) / ratingRows.length;
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      body: JSON.stringify({
        totalUsers: totalUsers || 0,
        totalReviews: totalReviews || 0,
        avgRating: Math.round(avgRating * 10) / 10
      })
    };
  }

  if (event.httpMethod === 'GET' && action === 'reviews') {
    const { data, error } = await supabase
      .from('platform_reviews')
      .select('id, name, rating, comment, avatar_url, social_url, qr_profile_url, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    return { statusCode: 200, body: JSON.stringify({ success: true, reviews: data || [] }) };
  }

  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: JSON.stringify({ success: false }) }; }

    const name = String(body.name || '').trim().slice(0, 80);
    const comment = String(body.comment || '').trim().slice(0, 800);
    let rating = parseInt(body.rating, 10);
    if (!name || name.length < 2) return { statusCode: 400, body: JSON.stringify({ success: false, reason: 'missing_name' }) };
    if (!comment || comment.length < 3) return { statusCode: 400, body: JSON.stringify({ success: false, reason: 'missing_comment' }) };
    if (!rating || rating < 1 || rating > 5) rating = 5;

    const host = event.headers['x-forwarded-host'] || event.headers.host || 'qrprofilcard.netlify.app';

    let avatar_url = null;
    let qr_profile_url = null;
    const social_url = body.social_url ? normalizeUrl(body.social_url).slice(0, 300) : null;

    if (body.qr_slug) {
      const qp = await lookupQrProfile(body.qr_slug, host);
      if (qp) {
        avatar_url = qp.avatarUrl;
        qr_profile_url = qp.profileUrl;
      } else {
        // Bu platformada uyğun profil tapılmadı (məs. başqa domenə aid link ola bilər) —
        // yenə də linki saxlayırıq ki, rəydə "kliklənə bilən" görünsün, sadəcə avatar çəkilmir.
        qr_profile_url = normalizeUrl(body.qr_slug).slice(0, 300) || null;
      }
    }
    if (!avatar_url && body.avatar_base64) {
      avatar_url = await uploadReviewAvatar(body.avatar_base64);
    }

    const { error } = await supabase.from('platform_reviews').insert({ name, rating, comment, avatar_url, social_url, qr_profile_url });
    if (error) return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };

    await notifyTelegram(
      `⭐ <b>Yeni platform rəyi</b>\n\n👤 ${esc(name)}\n` +
      `Reytinq: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}\n` +
      `💬 ${esc(comment)}`
    );

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 405, body: JSON.stringify({ success: false, reason: 'method_not_allowed' }) };
};
