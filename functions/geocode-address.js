exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ success: false }) };
  }

  const { address } = body;
  if (!address || address.trim().length < 3) {
    return { statusCode: 400, body: JSON.stringify({ success: false }) };
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'QRProfileCard/1.0 (contact via app owner)' }
    });
    const results = await r.json();
    if (!results || !results.length) {
      return { statusCode: 200, body: JSON.stringify({ success: false, reason: 'not_found' }) };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: e.message }) };
  }
};
