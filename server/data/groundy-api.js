'use strict';
// Proveedor de datos por API de Groundy. PENDIENTE: ajustar al contrato real.
// Hoy asume GET {GROUNDY_API_URL}?site_id=&lat=&lon= que devuelve el MISMO JSON que data/README.md describe.
// Si la API devuelve otra forma, adapta SOLO normalize(). No inventes endpoints: confirma con quien tenga Groundy.
const normalize = raw => raw; // TODO(equipo): mapear la respuesta real de Groundy al esquema de data/README.md
async function getSite({ siteId, lat, lon } = {}) {
  const { GROUNDY_API_URL, GROUNDY_API_KEY } = process.env;
  if (!GROUNDY_API_URL) return { status: 'not_configured', data: null };
  if (!siteId && (lat == null || lon == null)) return { status: 'missing_site', data: null };
  try {
    const u = new URL(GROUNDY_API_URL);
    if (siteId) u.searchParams.set('site_id', siteId);
    if (lat != null && lon != null) { u.searchParams.set('lat', lat); u.searchParams.set('lon', lon); }
    const r = await fetch(u, { headers: GROUNDY_API_KEY ? { Authorization: 'Bearer ' + GROUNDY_API_KEY } : {}, signal: AbortSignal.timeout(10000) });
    if (r.status === 404) return { status: 'not_found', data: null };
    if (!r.ok) return { status: 'error', data: null };
    return { status: 'ok', data: normalize(await r.json()) };
  } catch { return { status: 'error', data: null }; }
}
async function listSites() { return { status: 'not_supported', data: null }; }
module.exports = { getSite, listSites };
