'use strict';
// Herramientas que la IA puede llamar para consultar datos YA PROCESADOS. La IA no calcula ni inventa cifras:
// solo explica lo que estas funciones devuelven. Cada resultado incluye fuente, resolución y avisos.
const provider = require('./provider'), glossary = require('./glossary');
const SCALE = 'Clima (POWER ~50 km), humedad del suelo (SMAP ~9 km) y lluvia IMERG (~10 km) son valores regionales, no de cada metro del predio. Elevación/pendiente (30 m) y NDVI Sentinel-2 (10 m) sí varían dentro de la finca.';
const SITE = { site_id: { type: 'string', description: 'Identificador del sitio. Opcional si la pantalla ya tiene uno seleccionado.' } };
const definitions = [
  { name: 'list_sites', description: 'Lista los sitios con datos procesados disponibles.', parameters: { type: 'object', properties: {} } },
  { name: 'get_site_analysis', description: 'Datos procesados de un sitio: clima, vegetación, humedad del suelo, lluvia satelital y relieve, con fuente y resolución.', parameters: { type: 'object', properties: SITE } },
  { name: 'get_crop_suitability', description: 'Aptitud (0 a 1), mejor mes de siembra, factor limitante y confianza por cultivo en un sitio.', parameters: { type: 'object', properties: { ...SITE, crop: { type: 'string', description: 'Cultivo a filtrar (opcional), p. ej. papa.' } } } },
  { name: 'get_rotations', description: 'Rotaciones de cultivos propuestas por Groundy para un sitio, con su puntaje y la mejor.', parameters: { type: 'object', properties: SITE } },
  { name: 'explain_variable', description: 'Significado, unidad, resolución y advertencias de una variable (ndvi, aridity, suit, t_kill...). Funciona sin datos.', parameters: { type: 'object', properties: { name: { type: 'string', description: 'Nombre de la variable o concepto.' } }, required: ['name'] } },
];
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const demoNote = s => s.demo ? 'DATOS DE DEMOSTRACIÓN: no son reales; dilo en tu respuesta.' : null;
const NOT_FOUND = { status: 'not_found', message: 'No hay datos procesados de ese sitio. No inventes cifras: di que todavía no están disponibles.' };

async function resolveSite(args, ctx) {
  const plot = (ctx && ctx.plot) || {};
  const siteId = (args && args.site_id) || plot.siteId || (ctx && ctx.siteId) || null;
  if (!siteId && plot.lat == null) return { status: 'missing_site', message: 'Falta saber qué sitio o parcela consultar. Pregunta al usuario cuál (o usa list_sites).' };
  return provider.getSite({ siteId, lat: plot.lat, lon: plot.lon });
}
async function run(name, args, ctx) {
  args = args || {};
  if (name === 'explain_variable') { const m = glossary.lookup(args.name); return m.length ? { status: 'ok', variables: m } : { status: 'not_found', message: 'Esa variable no está en el diccionario de Groundy.' }; }
  if (name === 'list_sites') { const r = await provider.listSites(); return r.status === 'ok' && r.data.length ? { status: 'ok', sites: r.data } : { status: r.status === 'ok' ? 'no_data' : r.status, message: 'No hay sitios con datos procesados.' }; }
  const r = await resolveSite(args, ctx);
  if (r.status === 'missing_site') return r;
  if (r.status !== 'ok') return r.status === 'not_found' ? NOT_FOUND : { status: r.status, message: 'No pude consultar los datos ahora. No inventes cifras.' };
  const s = r.data;
  if (name === 'get_site_analysis') { const { crops, rotations, best_rotation, ...rest } = s; return { status: 'ok', site: rest, scale_note: SCALE, demo_note: demoNote(s) }; }
  if (name === 'get_crop_suitability') {
    let list = s.crops || []; if (args.crop) list = list.filter(c => norm(c.crop).includes(norm(args.crop)));
    return list.length ? { status: 'ok', site_id: s.siteId, crops: list, note: 'Aptitud de FAO EcoCrop por especie (no por variedad). Pendiente de validación agronómica.', demo_note: demoNote(s) } : { status: 'no_data', message: 'Sin resultados de aptitud para eso.' };
  }
  if (name === 'get_rotations') return s.rotations && s.rotations.length ? { status: 'ok', site_id: s.siteId, rotations: s.rotations, best_rotation: s.best_rotation || null, note: 'Escenarios para explorar; puntajes y reglas pendientes de validación agronómica. No es una prescripción.', demo_note: demoNote(s) } : { status: 'no_data', message: 'Sin rotaciones calculadas para este sitio.' };
  return { status: 'error', message: 'Herramienta desconocida.' };
}
const SCALARS = ['tmean_c', 'rain_mm_yr', 'et0_mm_yr', 'aridity', 'rain_imerg_mm_yr', 'rain_range_mm', 'elevacion_m'];
function sourceOf(s, sec) { return ((s[sec] && s[sec].source) || 'Groundy') + (s[sec] && s[sec].period ? ' · ' + s[sec].period : '') + (s.demo ? ' · DATOS DE DEMOSTRACIÓN' : ''); }
// Evidencia para el botón "Ver evidencia": las cifras exactas que devolvieron las herramientas.
function evidenceFrom(results) {
  const out = [];
  for (const t of results || []) if (t.name === 'get_site_analysis' && t.result.status === 'ok') {
    const s = t.result.site;
    for (const sec of ['climate', 'rain_imerg', 'terrain']) for (const k of SCALARS) { const v = s[sec] && s[sec][k]; if (typeof v === 'number') out.push({ factId: `site.${s.siteId}.${k}`, label: glossary.label(k), value: v, source: sourceOf(s, sec) }); }
  }
  return out;
}
// Para el modo reglas: convierte un sitio en el formato nasaData que ya entiende el motor.
function toNasaData(s) {
  const c = s && s.climate; if (!c) return null;
  const variables = {}; ['tmean_c', 'rain_mm_yr', 'et0_mm_yr', 'aridity'].forEach(k => { if (c[k] != null) variables[k] = c[k]; });
  return Object.keys(variables).length ? { source: c.source || 'NASA POWER', period: c.period, demo: !!s.demo, variables } : null;
}
module.exports = { definitions, run, evidenceFrom, toNasaData, resolveSite };
