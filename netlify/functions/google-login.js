const { createClient } = require('@supabase/supabase-js');
const { verifyGoogleToken } = require('./lib/googleAuth');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ success: false, reason: 'bad_json' }) };
  }

  const profile = await verifyGoogleToken(body.id_token);
  if (!profile) {
    return { statusCode: 401, body: JSON.stringify({ success: false, reason: 'invalid_token' }) };
  }

  // 1) Əvvəlcə google_sub üzrə tam uyğunluğa bax (əvvəllər Google ilə qeydiyyatdan keçib)
  let { data: license } = await supabase
    .from('licenses')
    .select('license_key, is_active, google_sub')
    .eq('google_sub', profile.sub)
    .maybeSingle();

  // 2) Tapılmadısa, eyni (Google tərəfindən təsdiqlənmiş) email ilə adi qeydiyyatdan keçən
  //    hesabı tap və avtomatik bu Google hesabına bağla ("hesabımı Google ilə əlaqələndir").
  //    (.or() ilə JSON sahəsi üzrə qarışıq axtarış yerinə, etibarlılıq üçün 2 ayrı sadə sorğu.)
  if (!license) {
    const { data: byGoogleEmail } = await supabase
      .from('licenses')
      .select('license_key, is_active')
      .eq('google_email', profile.email)
      .maybeSingle();
    license = byGoogleEmail || null;
  }
  if (!license) {
    const { data: byContactEmail } = await supabase
      .from('licenses')
      .select('license_key, is_active')
      .eq('profile_data->>contactEmail', profile.email)
      .maybeSingle();
    license = byContactEmail || null;
  }
  if (license) {
    await supabase.from('licenses').update({ google_sub: profile.sub, google_email: profile.email }).eq('license_key', license.license_key);
  }

  if (!license) {
    return { statusCode: 404, body: JSON.stringify({ success: false, reason: 'not_registered', email: profile.email, name: profile.name }) };
  }
  if (!license.is_active) {
    return { statusCode: 403, body: JSON.stringify({ success: false, reason: 'inactive' }) };
  }

  return { statusCode: 200, body: JSON.stringify({ success: true, license_key: license.license_key }) };
};
