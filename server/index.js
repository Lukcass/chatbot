'use strict';
require('./env');
const http = require('http'), fs = require('fs'), path = require('path');
const { handleChat } = require('./chat'), engine = require('../src/engine'), llm = require('./llm');
const WEB = path.join(__dirname, '..', 'web'), P = '/api/papanauta';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
const server = http.createServer(async (req, res) => {
  if (process.env.ALLOWED_ORIGIN) { res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN); res.setHeader('Access-Control-Allow-Headers', 'content-type'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS'); }
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url, 'http://x');
  if (url.pathname === P + '/health') return send(res, 200, { ok: true, capabilities: { llm: llm.configured(), vision: false, nasa: !!process.env.NASA_API_URL } });
  if (url.pathname === P + '/suggestions') { const l = url.searchParams.get('lang') === 'en' ? 'en' : 'es', s = url.searchParams.get('section'); return send(res, 200, { suggestions: engine.SUGGESTIONS[l][engine.SECTIONS.includes(s) ? s : 'inicio'] }); }
  if (url.pathname === P + '/image' && req.method === 'POST') return send(res, 501, { available: false, message: 'El análisis de imágenes todavía no está conectado.' });
  if (url.pathname === P + '/chat' && req.method === 'POST') {
    let raw = ''; for await (const c of req) { raw += c; if (raw.length > 100000) return send(res, 413, { error: 'too_large' }); }
    let body; try { body = JSON.parse(raw); } catch { return send(res, 400, { error: 'bad_json' }); }
    const r = await handleChat(body); return send(res, r.status, r.json);
  }
  const f = path.join(WEB, path.normalize(url.pathname === '/' ? '/demo.html' : url.pathname));
  if (f.startsWith(WEB) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); return fs.createReadStream(f).pipe(res); }
  send(res, 404, { error: 'not_found' });
});
if (require.main === module) server.listen(process.env.PORT || 8787, () => console.log('Papanauta en http://localhost:' + (process.env.PORT || 8787)));
module.exports = server;
