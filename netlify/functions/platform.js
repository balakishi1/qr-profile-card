const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function esc(s) {
  return String(s || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
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
      .select('id, name, rating, comment, created_at')
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

    const { error } = await supabase.from('platform_reviews').insert({ name, rating, comment });
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
