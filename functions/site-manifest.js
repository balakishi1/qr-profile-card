const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

exports.handler = async (event) => {
  const slug = event.queryStringParameters && event.queryStringParameters.slug;
  if (!slug) return { statusCode: 404, body: '{}' };

  const { data: license } = await supabase
    .from('licenses')
    .select('owner_name, profile_data')
    .eq('profile_slug', slug)
    .single();

  const d = (license && license.profile_data) || {};
  const icon = d.avatar || '';

  const manifest = {
    name: (license && license.owner_name) || 'Profil',
    short_name: (license && license.owner_name) || 'Profil',
    start_url: `/p/${slug}`,
    display: 'standalone',
    background_color: '#0b1220',
    theme_color: '#0b1220',
    icons: icon ? [
      { src: icon, sizes: '192x192', type: 'image/jpeg' },
      { src: icon, sizes: '512x512', type: 'image/jpeg' }
    ] : []
  };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/manifest+json' },
    body: JSON.stringify(manifest)
  };
};
