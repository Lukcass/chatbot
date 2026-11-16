'use strict';
// Proveedor de datos por ARCHIVOS: lee resultados ya procesados (JSON) de data/sites/*.json (o DATA_DIR).
// Es la forma más simple de conectar el chatbot hoy: exporta de Groundy un JSON por sitio y colócalo en esa carpeta.
const fs = require('fs'), path = require('path');
const dir = () => process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data', 'sites');
let cache = null;
function load() {
  cache = []; const d = dir(); if (!fs.existsSync(d)) return;
  for (const f of fs.readdirSync(d).filter(f => f.endsWith('.json'))) {
    try { const j = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')); (Array.isArray(j) ? j : [j]).forEach(s => { if (s && s.siteId) cache.push(s); }); }
    catch { console.warn('[papanauta] no pude leer', f); }
  }
}
const sites = () => { if (!cache) load(); return cache; };
async function listSites() { return { status: 'ok', data: sites().map(s => ({ siteId: s.siteId, name: s.name || s.siteId, demo: !!s.demo })) }; }
async function getSite({ siteId, lat, lon } = {}) {
  const all = sites(); if (!all.length) return { status: 'no_data', data: null };
  let s = siteId && all.find(x => String(x.siteId).toLowerCase() === String(siteId).toLowerCase());
  if (!s && lat != null && lon != null) s = all.find(x => x.lat != null && Math.abs(x.lat - lat) < 0.05 && Math.abs(x.lon - lon) < 0.05);
  return s ? { status: 'ok', data: s } : { status: 'not_found', data: null };
}
module.exports = { listSites, getSite, reload: () => { cache = null; } };
