const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('./lib/socialAuth');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const ONLINE_WINDOW_MS = 90 * 1000; // 90 saniyə ərzində "ping" gəlibsə, onlayn sayılır

function esc(s) { return String(s || '').slice(0, 200); }
function escSearchTerm(s) { return String(s || '').replace(/[,()%*]/g, '').slice(0, 60); }
// slug-lar (profile_slug) yalnız hərf/rəqəm/tire ilə yaranır — .or() filtrini poza biləcək
// simvolları (vergül, mötərizə) kəsib atırıq ki, sorğu inject/pozula bilməsin.
function safeSlug(s) { return String(s || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60); }

function publicProfileCard(row) {
  const d = row.profile_data || {};
  return {
    slug: row.profile_slug,
    name: row.owner_name || '',
    avatar: d.avatar || null,
    isOnline: !!(row.last_seen && (Date.now() - new Date(row.last_seen).getTime()) < ONLINE_WINDOW_MS)
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: JSON.stringify({ success: false }) }; }

  const auth = await requireAuth(supabase, body);
  if (!auth.ok) return { statusCode: auth.statusCode, body: JSON.stringify({ success: false, reason: auth.reason }) };
  const mySlug = auth.license.profile_slug;

  // Hər autentifikasiya olunmuş çağırışda "son görülmə" yenilənir (əlavə heartbeat çağırışına ehtiyac azalır)
  supabase.from('licenses').update({ last_seen: new Date().toISOString() }).eq('profile_slug', mySlug).then(() => {}, () => {});

  const action = body.action;

  try {
    if (action === 'search') {
      const q = escSearchTerm(body.q).trim();
      if (q.length < 2) return { statusCode: 200, body: JSON.stringify({ success: true, results: [] }) };

      const { data: rows } = await supabase
        .from('licenses')
        .select('profile_slug, owner_name, profile_data, last_seen, is_active')
        .eq('is_active', true)
        .or(`owner_name.ilike.%${q}%,profile_slug.ilike.%${q}%`)
        .neq('profile_slug', mySlug)
        .limit(20);

      const results = (rows || []).map(publicProfileCard);

      // Bu istifadəçilərlə artıq olan münasibəti də bildirək (dost / gözləyən / özün göndərmisən)
      const slugs = results.map(r => r.slug);
      let relMap = {};
      if (slugs.length) {
        const { data: rels } = await supabase
          .from('friend_requests')
          .select('from_slug, to_slug, status')
          .or(`and(from_slug.eq.${mySlug},to_slug.in.(${slugs.join(',')})),and(to_slug.eq.${mySlug},from_slug.in.(${slugs.join(',')}))`);
        (rels || []).forEach(r => {
          const otherSlug = r.from_slug === mySlug ? r.to_slug : r.from_slug;
          if (r.status === 'accepted') relMap[otherSlug] = 'friends';
          else if (r.status === 'pending') relMap[otherSlug] = (r.from_slug === mySlug) ? 'pending_sent' : 'pending_received';
        });
      }
      results.forEach(r => { r.relation = relMap[r.slug] || 'none'; });

      return { statusCode: 200, body: JSON.stringify({ success: true, results }) };
    }

    if (action === 'request') {
      const toSlug = safeSlug(body.to_slug);
      if (!toSlug || toSlug === mySlug) return { statusCode: 400, body: JSON.stringify({ success: false, reason: 'invalid_target' }) };

      const { data: target } = await supabase.from('licenses').select('profile_slug, is_active').eq('profile_slug', toSlug).maybeSingle();
      if (!target || !target.is_active) return { statusCode: 404, body: JSON.stringify({ success: false, reason: 'not_found' }) };

      // Əks istiqamətdə artıq gözləyən sorğu varsa (o mənə göndəribsə), avtomatik qəbul et
      const { data: reverse } = await supabase
        .from('friend_requests')
        .select('id, status')
        .eq('from_slug', toSlug).eq('to_slug', mySlug)
        .maybeSingle();

      if (reverse && reverse.status === 'pending') {
        await supabase.from('friend_requests').update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', reverse.id);
        return { statusCode: 200, body: JSON.stringify({ success: true, status: 'accepted' }) };
      }

      const { error } = await supabase.from('friend_requests').insert({ from_slug: mySlug, to_slug: toSlug, status: 'pending' });
      if (error) {
        if (error.code === '23505') return { statusCode: 200, body: JSON.stringify({ success: true, status: 'already_pending' }) };
        return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
      }
      return { statusCode: 200, body: JSON.stringify({ success: true, status: 'pending' }) };
    }

    if (action === 'respond') {
      const fromSlug = safeSlug(body.from_slug);
      const decision = body.decision === 'accept' ? 'accepted' : 'declined';
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: decision, responded_at: new Date().toISOString() })
        .eq('from_slug', fromSlug).eq('to_slug', mySlug).eq('status', 'pending');
      if (error) return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    if (action === 'remove') {
      const otherSlug = safeSlug(body.slug);
      await supabase.from('friend_requests')
        .delete()
        .or(`and(from_slug.eq.${mySlug},to_slug.eq.${otherSlug}),and(from_slug.eq.${otherSlug},to_slug.eq.${mySlug})`);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    if (action === 'incoming') {
      const { data: rows } = await supabase
        .from('friend_requests')
        .select('from_slug, created_at')
        .eq('to_slug', mySlug).eq('status', 'pending')
        .order('created_at', { ascending: false });
      const slugs = (rows || []).map(r => r.from_slug);
      let profiles = [];
      if (slugs.length) {
        const { data: lic } = await supabase.from('licenses').select('profile_slug, owner_name, profile_data, last_seen').in('profile_slug', slugs);
        profiles = (lic || []).map(publicProfileCard);
      }
      return { statusCode: 200, body: JSON.stringify({ success: true, requests: profiles }) };
    }

    if (action === 'list') {
      const { data: rels } = await supabase
        .from('friend_requests')
        .select('from_slug, to_slug')
        .eq('status', 'accepted')
        .or(`from_slug.eq.${mySlug},to_slug.eq.${mySlug}`);

      const friendSlugs = (rels || []).map(r => (r.from_slug === mySlug ? r.to_slug : r.from_slug));
      if (!friendSlugs.length) return { statusCode: 200, body: JSON.stringify({ success: true, friends: [] }) };

      const { data: lic } = await supabase.from('licenses').select('profile_slug, owner_name, profile_data, last_seen').in('profile_slug', friendSlugs);
      const friends = (lic || []).map(publicProfileCard).sort((a, b) => (b.isOnline - a.isOnline) || a.name.localeCompare(b.name));
      return { statusCode: 200, body: JSON.stringify({ success: true, friends }) };
    }

    return { statusCode: 400, body: JSON.stringify({ success: false, reason: 'unknown_action' }) };
  } catch (e) {
    console.error('friends.js error', e);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: e.message }) };
  }
};
