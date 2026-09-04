const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { requireAuth } = require('./lib/socialAuth');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const ONLINE_WINDOW_MS = 90 * 1000;

function esc(s) { return String(s || '').slice(0, 4000); }
function safeSlug(s) { return String(s || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60); }

// Qrup şəklini (kiçik base64 thumbnail) 'media' bucket-inə yükləyir
async function uploadGroupAvatar(dataUri) {
  const m = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/.exec(String(dataUri || ''));
  if (!m) return null;
  const ext = m[1] === 'image/png' ? 'png' : (m[1] === 'image/webp' ? 'webp' : 'jpg');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 900 * 1024) return null;
  const path = `groups/${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, buf, { contentType: m[1], upsert: false });
  if (error) return null;
  const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
  return pub.publicUrl;
}

async function areFriends(slugA, slugB) {
  const { data } = await supabase
    .from('friend_requests')
    .select('id')
    .eq('status', 'accepted')
    .or(`and(from_slug.eq.${slugA},to_slug.eq.${slugB}),and(from_slug.eq.${slugB},to_slug.eq.${slugA})`)
    .maybeSingle();
  return !!data;
}

async function isMember(conversationId, slug) {
  const { data } = await supabase
    .from('conversation_members')
    .select('role')
    .eq('conversation_id', conversationId).eq('slug', slug)
    .maybeSingle();
  return data || null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: JSON.stringify({ success: false }) }; }

  const auth = await requireAuth(supabase, body);
  if (!auth.ok) return { statusCode: auth.statusCode, body: JSON.stringify({ success: false, reason: auth.reason }) };
  const mySlug = auth.license.profile_slug;

  supabase.from('licenses').update({ last_seen: new Date().toISOString() }).eq('profile_slug', mySlug).then(() => {}, () => {});

  const action = body.action;

  try {
    // ---------- Fərdi söhbət tap və ya yarat (yalnız dostlar arasında) ----------
    if (action === 'create_direct') {
      const otherSlug = safeSlug(body.slug);
      if (!otherSlug || otherSlug === mySlug) return { statusCode: 400, body: JSON.stringify({ success: false, reason: 'invalid_target' }) };
      if (!(await areFriends(mySlug, otherSlug))) {
        return { statusCode: 403, body: JSON.stringify({ success: false, reason: 'not_friends' }) };
      }

      // Mövcud fərdi söhbət varmı?
      const { data: myConvs } = await supabase.from('conversation_members').select('conversation_id').eq('slug', mySlug);
      const myConvIds = (myConvs || []).map(c => c.conversation_id);
      if (myConvIds.length) {
        const { data: otherConvs } = await supabase
          .from('conversation_members')
          .select('conversation_id, conversations!inner(type)')
          .eq('slug', otherSlug)
          .in('conversation_id', myConvIds)
          .eq('conversations.type', 'direct');
        if (otherConvs && otherConvs.length) {
          return { statusCode: 200, body: JSON.stringify({ success: true, conversation_id: otherConvs[0].conversation_id }) };
        }
      }

      const { data: conv, error } = await supabase.from('conversations').insert({ type: 'direct', created_by: mySlug }).select().single();
      if (error) return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
      await supabase.from('conversation_members').insert([
        { conversation_id: conv.id, slug: mySlug, role: 'member' },
        { conversation_id: conv.id, slug: otherSlug, role: 'member' }
      ]);
      return { statusCode: 200, body: JSON.stringify({ success: true, conversation_id: conv.id }) };
    }

    // ---------- Qrup söhbəti yarat ----------
    if (action === 'create_group') {
      const name = esc(body.name).trim().slice(0, 80) || 'Yeni qrup';
      const memberSlugs = Array.isArray(body.member_slugs) ? body.member_slugs.map(safeSlug).filter(s => s && s !== mySlug) : [];

      let avatar = null;
      if (body.avatar_base64) avatar = await uploadGroupAvatar(body.avatar_base64);

      // Yalnız dostlarını qrupa əlavə edə bilər
      const validMembers = [];
      for (const s of memberSlugs) {
        if (await areFriends(mySlug, s)) validMembers.push(s);
      }

      const { data: conv, error } = await supabase.from('conversations').insert({ type: 'group', name, avatar, created_by: mySlug }).select().single();
      if (error) return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };

      const rows = [{ conversation_id: conv.id, slug: mySlug, role: 'admin' }, ...validMembers.map(s => ({ conversation_id: conv.id, slug: s, role: 'member' }))];
      await supabase.from('conversation_members').insert(rows);
      return { statusCode: 200, body: JSON.stringify({ success: true, conversation_id: conv.id, avatar, added: validMembers.length }) };
    }

    // ---------- Qrupa üzv əlavə et (yalnız admin, yalnız öz dostlarını) ----------
    if (action === 'add_member') {
      const conversationId = body.conversation_id;
      const targetSlug = safeSlug(body.slug);
      const member = await isMember(conversationId, mySlug);
      if (!member || member.role !== 'admin') return { statusCode: 403, body: JSON.stringify({ success: false, reason: 'not_admin' }) };
      if (!(await areFriends(mySlug, targetSlug))) return { statusCode: 403, body: JSON.stringify({ success: false, reason: 'not_friends' }) };
      await supabase.from('conversation_members').upsert({ conversation_id: conversationId, slug: targetSlug, role: 'member' }, { onConflict: 'conversation_id,slug' });
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    // ---------- Söhbətdən çıx / üzvü sil ----------
    if (action === 'leave_conversation') {
      await supabase.from('conversation_members').delete().eq('conversation_id', body.conversation_id).eq('slug', mySlug);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    // ---------- Söhbətlərin siyahısı (son mesaj + oxunmamış say ilə) ----------
    if (action === 'conversations') {
      const { data: myMemberships } = await supabase
        .from('conversation_members')
        .select('conversation_id, last_read_at')
        .eq('slug', mySlug);
      if (!myMemberships || !myMemberships.length) return { statusCode: 200, body: JSON.stringify({ success: true, conversations: [] }) };

      const convIds = myMemberships.map(m => m.conversation_id);
      const lastReadMap = {};
      myMemberships.forEach(m => { lastReadMap[m.conversation_id] = m.last_read_at; });

      const { data: convs } = await supabase.from('conversations').select('*').in('id', convIds);
      const { data: allMembers } = await supabase.from('conversation_members').select('conversation_id, slug').in('conversation_id', convIds);

      const memberSlugsByConv = {};
      (allMembers || []).forEach(m => {
        if (!memberSlugsByConv[m.conversation_id]) memberSlugsByConv[m.conversation_id] = [];
        memberSlugsByConv[m.conversation_id].push(m.slug);
      });

      const allOtherSlugs = [...new Set((allMembers || []).map(m => m.slug).filter(s => s !== mySlug))];
      const { data: profiles } = allOtherSlugs.length
        ? await supabase.from('licenses').select('profile_slug, owner_name, profile_data, last_seen').in('profile_slug', allOtherSlugs)
        : { data: [] };
      const profileMap = {};
      (profiles || []).forEach(p => {
        const d = p.profile_data || {};
        profileMap[p.profile_slug] = { slug: p.profile_slug, name: p.owner_name || '', avatar: d.avatar || null, isOnline: !!(p.last_seen && (Date.now() - new Date(p.last_seen).getTime()) < ONLINE_WINDOW_MS) };
      });

      const result = [];
      for (const conv of (convs || [])) {
        const { data: lastMsgArr } = await supabase
          .from('messages').select('body, sender_slug, created_at')
          .eq('conversation_id', conv.id).order('created_at', { ascending: false }).limit(1);
        const lastMsg = lastMsgArr && lastMsgArr[0];

        const { count: unreadCount } = await supabase
          .from('messages').select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .gt('created_at', lastReadMap[conv.id] || '1970-01-01')
          .neq('sender_slug', mySlug);

        const memberSlugs = (memberSlugsByConv[conv.id] || []).filter(s => s !== mySlug);
        const otherProfiles = memberSlugs.map(s => profileMap[s]).filter(Boolean);

        let title, avatar, isOnline;
        if (conv.type === 'group') {
          title = conv.name || 'Qrup';
          avatar = conv.avatar || null;
          isOnline = otherProfiles.some(p => p.isOnline);
        } else {
          const other = otherProfiles[0];
          title = other ? other.name : '?';
          avatar = other ? other.avatar : null;
          isOnline = other ? other.isOnline : false;
        }

        result.push({
          id: conv.id, type: conv.type, title, avatar, isOnline,
          memberCount: (memberSlugsByConv[conv.id] || []).length,
          lastMessage: lastMsg ? lastMsg.body : '',
          lastMessageAt: lastMsg ? lastMsg.created_at : conv.created_at,
          lastMessageMine: lastMsg ? lastMsg.sender_slug === mySlug : false,
          unreadCount: unreadCount || 0
        });
      }
      result.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      return { statusCode: 200, body: JSON.stringify({ success: true, conversations: result }) };
    }

    // ---------- Söhbətin üzv siyahısı (qrup idarəetməsi üçün) ----------
    if (action === 'members') {
      const member = await isMember(body.conversation_id, mySlug);
      if (!member) return { statusCode: 403, body: JSON.stringify({ success: false, reason: 'not_member' }) };
      const { data: rows } = await supabase.from('conversation_members').select('slug, role').eq('conversation_id', body.conversation_id);
      const slugs = (rows || []).map(r => r.slug);
      const { data: profiles } = slugs.length
        ? await supabase.from('licenses').select('profile_slug, owner_name, profile_data, last_seen').in('profile_slug', slugs)
        : { data: [] };
      const list = (rows || []).map(r => {
        const p = (profiles || []).find(x => x.profile_slug === r.slug) || {};
        const d = p.profile_data || {};
        return { slug: r.slug, role: r.role, name: p.owner_name || '', avatar: d.avatar || null, isOnline: !!(p.last_seen && (Date.now() - new Date(p.last_seen).getTime()) < ONLINE_WINDOW_MS) };
      });
      return { statusCode: 200, body: JSON.stringify({ success: true, members: list }) };
    }

    // ---------- Mesaj tarixçəsi ----------
    if (action === 'history') {
      const member = await isMember(body.conversation_id, mySlug);
      if (!member) return { statusCode: 403, body: JSON.stringify({ success: false, reason: 'not_member' }) };

      const before = body.before || null;
      let q = supabase.from('messages').select('id, sender_slug, body, created_at, msg_type, attachment_url, attachment_name, meta').eq('conversation_id', body.conversation_id).order('created_at', { ascending: false }).limit(50);
      if (before) q = q.lt('created_at', before);
      const { data: rows } = await q;

      const senderSlugs = [...new Set((rows || []).map(r => r.sender_slug))];
      const { data: profiles } = senderSlugs.length
        ? await supabase.from('licenses').select('profile_slug, owner_name, profile_data').in('profile_slug', senderSlugs)
        : { data: [] };
      const nameMap = {};
      (profiles || []).forEach(p => { nameMap[p.profile_slug] = { name: p.owner_name || '', avatar: (p.profile_data || {}).avatar || null }; });

      const messages = (rows || []).reverse().map(r => ({
        id: r.id, senderSlug: r.sender_slug, mine: r.sender_slug === mySlug,
        senderName: (nameMap[r.sender_slug] || {}).name || '',
        senderAvatar: (nameMap[r.sender_slug] || {}).avatar || null,
        body: r.body, createdAt: r.created_at,
        msgType: r.msg_type || 'text', attachmentUrl: r.attachment_url || null, attachmentName: r.attachment_name || null, meta: r.meta || null
      }));

      await supabase.from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', body.conversation_id).eq('slug', mySlug);

      return { statusCode: 200, body: JSON.stringify({ success: true, messages }) };
    }

    // ---------- Mesaj göndər (mətn və ya əlavə: şəkil/video/səs/fayl/konum) ----------
    if (action === 'send') {
      const member = await isMember(body.conversation_id, mySlug);
      if (!member) return { statusCode: 403, body: JSON.stringify({ success: false, reason: 'not_member' }) };

      const msgType = ['text', 'image', 'video', 'audio', 'file', 'location'].includes(body.msg_type) ? body.msg_type : 'text';
      const text = esc(body.body).trim();
      const attachmentUrl = msgType !== 'text' ? String(body.attachment_url || '').slice(0, 600) : null;
      const attachmentName = msgType !== 'text' ? String(body.attachment_name || '').slice(0, 200) : null;
      let meta = null;
      if (msgType === 'location' && body.meta && typeof body.meta.lat === 'number' && typeof body.meta.lng === 'number') {
        meta = { lat: body.meta.lat, lng: body.meta.lng, label: String(body.meta.label || '').slice(0, 120) };
      } else if (['audio', 'video'].includes(msgType) && body.meta && body.meta.duration) {
        meta = { duration: Number(body.meta.duration) || 0 };
      }

      if (msgType === 'text' && !text) return { statusCode: 400, body: JSON.stringify({ success: false, reason: 'empty' }) };
      if (msgType !== 'text' && msgType !== 'location' && !attachmentUrl) return { statusCode: 400, body: JSON.stringify({ success: false, reason: 'missing_attachment' }) };
      if (msgType === 'location' && !meta) return { statusCode: 400, body: JSON.stringify({ success: false, reason: 'missing_location' }) };

      const { data: msg, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: body.conversation_id, sender_slug: mySlug,
          body: text || (msgType === 'location' ? '📍 Konum' : ''),
          msg_type: msgType, attachment_url: attachmentUrl, attachment_name: attachmentName, meta
        })
        .select().single();
      if (error) return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };

      await supabase.from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', body.conversation_id).eq('slug', mySlug);

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: {
            id: msg.id, senderSlug: mySlug, mine: true, body: msg.body, createdAt: msg.created_at,
            msgType, attachmentUrl, attachmentName, meta
          }
        })
      };
    }

    // ---------- Yeni mesajları poll et (son bilinən mesaj vaxtından bəri) ----------
    if (action === 'poll') {
      const member = await isMember(body.conversation_id, mySlug);
      if (!member) return { statusCode: 403, body: JSON.stringify({ success: false, reason: 'not_member' }) };
      const since = body.since || '1970-01-01';
      const { data: rows } = await supabase
        .from('messages').select('id, sender_slug, body, created_at, msg_type, attachment_url, attachment_name, meta')
        .eq('conversation_id', body.conversation_id).gt('created_at', since)
        .order('created_at', { ascending: true }).limit(100);

      const senderSlugs = [...new Set((rows || []).map(r => r.sender_slug))];
      const { data: profiles } = senderSlugs.length
        ? await supabase.from('licenses').select('profile_slug, owner_name, profile_data').in('profile_slug', senderSlugs)
        : { data: [] };
      const nameMap = {};
      (profiles || []).forEach(p => { nameMap[p.profile_slug] = { name: p.owner_name || '', avatar: (p.profile_data || {}).avatar || null }; });

      const messages = (rows || []).map(r => ({
        id: r.id, senderSlug: r.sender_slug, mine: r.sender_slug === mySlug,
        senderName: (nameMap[r.sender_slug] || {}).name || '',
        senderAvatar: (nameMap[r.sender_slug] || {}).avatar || null,
        body: r.body, createdAt: r.created_at,
        msgType: r.msg_type || 'text', attachmentUrl: r.attachment_url || null, attachmentName: r.attachment_name || null, meta: r.meta || null
      }));

      if (messages.length) {
        await supabase.from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', body.conversation_id).eq('slug', mySlug);
      }
      return { statusCode: 200, body: JSON.stringify({ success: true, messages }) };
    }

    return { statusCode: 400, body: JSON.stringify({ success: false, reason: 'unknown_action' }) };
  } catch (e) {
    console.error('messages.js error', e);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: e.message }) };
  }
};
