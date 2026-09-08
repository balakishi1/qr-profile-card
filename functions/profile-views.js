const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('./lib/socialAuth');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: JSON.stringify({ success: false }) }; }

  const auth = await requireAuth(supabase, body);
  if (!auth.ok) return { statusCode: auth.statusCode, body: JSON.stringify({ success: false, reason: auth.reason }) };
  const mySlug = auth.license.profile_slug;

  const action = body.action;

  try {
    if (action === 'list') {
      const { data: rows } = await supabase
        .from('profile_views_log')
        .select('id, city, country, first_viewed_at, last_viewed_at, view_count, seen_by_owner')
        .eq('profile_slug', mySlug)
        .order('last_viewed_at', { ascending: false })
        .limit(40);

      const views = (rows || []).map(r => ({
        id: r.id,
        location: [r.city, r.country].filter(Boolean).join(', ') || 'Naməlum yer',
        firstViewedAt: r.first_viewed_at,
        lastViewedAt: r.last_viewed_at,
        viewCount: r.view_count,
        seen: r.seen_by_owner
      }));
      const unseenCount = views.filter(v => !v.seen).length;

      return { statusCode: 200, body: JSON.stringify({ success: true, views, unseenCount }) };
    }

    if (action === 'mark_seen') {
      await supabase.from('profile_views_log').update({ seen_by_owner: true }).eq('profile_slug', mySlug).eq('seen_by_owner', false);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ success: false, reason: 'unknown_action' }) };
  } catch (e) {
    console.error('profile-views.js error', e);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: e.message }) };
  }
};
