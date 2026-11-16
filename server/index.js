'use strict';
require('./env');
const http = require('http'), fs = require('fs'), path = require('path');
const { handleChat } = require('./chat'), engine = require('../src/engine'), llm = require('./llm'), provider = require('./data/provider');
const WEB = path.join(__dirname, '..', 'web'), P = '/api/papanauta';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
// Límite simple por IP (en memoria) para no agotar la cuota gratuita de la IA. RATE_LIMIT_PER_MIN=0 lo desactiva.
const hits = new Map();
const clientIp = req => (process.env.TRUST_PROXY === '1' && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '?';
function limited(req) {
  const max = process.env.RATE_LIMIT_PER_MIN === undefined ? 60 : +process.env.RATE_LIMIT_PER_MIN; if (!max) return false;
  const ip = clientIp(req), now = Date.now();
  const a = (hits.get(ip) || []).filter(t => now - t < 60000); a.push(now); hits.set(ip, a);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < 60000)) hits.delete(k);
  return a.length > max;
}
const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
const server = http.createServer(async (req, res) => {
  if (process.env.ALLOWED_ORIGIN) { res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN); res.setHeader('Access-Control-Allow-Headers', 'content-type'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS'); }
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url, 'http://x');
  if (url.pathname === P + '/health') return send(res, 200, { ok: true, capabilities: { llm: llm.configured(), providers: llm.providers().map(p => p.name), data: provider.name() }, load: require('./limits').status() });
  if (url.pathname === P + '/suggestions') { const l = url.searchParams.get('lang') === 'en' ? 'en' : 'es', s = url.searchParams.get('section'); return send(res, 200, { suggestions: engine.SUGGESTIONS[l][engine.SECTIONS.includes(s) ? s : 'inicio'] }); }
  if (url.pathname === P + '/chat' && req.method === 'POST') {
    if (limited(req)) { res.setHeader('Retry-After', '60'); return send(res, 429, { error: 'rate_limited' }); }
    const parts = []; let size = 0; for await (const c of req) { size += c.length; if (size > 100000) { send(res, 413, { error: 'too_large' }); return req.destroy(); } parts.push(c); }
    let body; try { body = JSON.parse(Buffer.concat(parts).toString('utf8')); } catch { return send(res, 400, { error: 'bad_json' }); }
    const r = await handleChat(body, { ip: clientIp(req) }); return send(res, r.status, r.json);
  }
  const f = path.join(WEB, path.normalize(url.pathname === '/' ? '/demo.html' : url.pathname));
  if (f.startsWith(WEB + path.sep) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); return fs.createReadStream(f).pipe(res); }
  send(res, 404, { error: 'not_found' });
});
if (require.main === module) server.listen(process.env.PORT || 8787, () => console.log('Papanauta en http://localhost:' + (process.env.PORT || 8787)));
module.exports = server;
