export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    try {
      if (url.pathname === '/autocomplete' && request.method === 'GET') {
        const text = url.searchParams.get('text') || '';
        const orsUrl = `https://api.openrouteservice.org/geocode/autocomplete?api_key=${encodeURIComponent(env.ORS_API_KEY)}&text=${encodeURIComponent(text)}&size=6&boundary.country=PE`;
        const res = await fetch(orsUrl);
        const data = await res.json();

        const results = (data.features || []).map(f => ({
          lat: Number(f.geometry.coordinates[1]),
          lon: Number(f.geometry.coordinates[0]),
          label: f.properties?.label || f.properties?.name || 'Ubicación'
        }));

        return json({ results });
      }

      if (url.pathname === '/search' && request.method === 'GET') {
        const text = url.searchParams.get('text') || '';
        const orsUrl = `https://api.openrouteservice.org/geocode/search?api_key=${encodeURIComponent(env.ORS_API_KEY)}&text=${encodeURIComponent(text)}&size=1&boundary.country=PE`;
        const res = await fetch(orsUrl);
        const data = await res.json();
        const f = data.features?.[0];

        if (!f) return json({ error: 'No encontrado' }, 404);

        const result = {
          lat: Number(f.geometry.coordinates[1]),
          lon: Number(f.geometry.coordinates[0]),
          label: f.properties?.label || f.properties?.name || 'Ubicación'
        };

        return json({ result });
      }

      if (url.pathname === '/reverse' && request.method === 'GET') {
        const lat = url.searchParams.get('lat');
        const lon = url.searchParams.get('lon');

        const orsUrl = `https://api.openrouteservice.org/geocode/reverse?api_key=${encodeURIComponent(env.ORS_API_KEY)}&point.lon=${encodeURIComponent(lon)}&point.lat=${encodeURIComponent(lat)}&size=1`;
        const res = await fetch(orsUrl);
        const data = await res.json();
        const f = data.features?.[0];

        if (!f) {
          return json({
            result: {
              lat: Number(lat),
              lon: Number(lon),
              label: `${lat}, ${lon}`
            }
          });
        }

        const result = {
          lat: Number(f.geometry.coordinates[1]),
          lon: Number(f.geometry.coordinates[0]),
          label: f.properties?.label || f.properties?.name || `${lat}, ${lon}`
        };

        return json({ result });
      }

      if (url.pathname === '/route' && request.method === 'POST') {
        const body = await request.json();
        const from = body.from;
        const to = body.to;

        const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
          method: 'POST',
          headers: {
            'Authorization': env.ORS_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            coordinates: [
              [from.lon, from.lat],
              [to.lon, to.lat]
            ]
          })
        });

        const data = await res.json();
        const feature = data.features?.[0];

        if (!feature) return json({ error: 'Ruta no encontrada' }, 404);

        return json({
          summary: feature.properties.summary,
          feature
        });
      }

      return json({ error: 'Ruta no válida' }, 404);
    } catch (error) {
      return json({ error: error.message || 'Error interno' }, 500);
    }
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders()
    }
  });
}
