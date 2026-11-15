'use strict';
// Adaptador de datos NASA. Solo usa la fuente aprobada por el equipo (Groundy/NASA). Nunca inventa datos.
// TODO(equipo): ajustar parámetros y forma de la respuesta al contrato real de la API de Groundy.
async function getNasaData({ lat, lon, start, end } = {}) {
  const { NASA_API_URL, NASA_API_KEY, NASA_DATA_PROVIDER } = process.env;
  if (!NASA_API_URL) return { status: 'not_configured', data: null };
  if (lat == null || lon == null) return { status: 'missing_coordinates', data: null };
  try {
    const u = new URL(NASA_API_URL);
    Object.entries({ lat, lon, start: start || process.env.NASA_START_DATE, end: end || process.env.NASA_END_DATE }).forEach(([k, v]) => v && u.searchParams.set(k, v));
    const r = await fetch(u, { headers: NASA_API_KEY ? { Authorization: 'Bearer ' + NASA_API_KEY } : {}, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return { status: 'error', data: null };
    return { status: 'ok', data: { source: NASA_DATA_PROVIDER || 'NASA', demo: false, variables: (await r.json()).variables || null } };
  } catch { return { status: 'error', data: null }; }
}
module.exports = { getNasaData };
