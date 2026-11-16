const test = require('node:test'), assert = require('node:assert'), http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const tools = require('../server/data/tools'), glossary = require('../server/data/glossary'), guard = require('../server/guard');
const { handleChat } = require('../server/chat'), server = require('../server/index'), engine = require('../src/engine');
delete process.env.GROUNDY_API_URL;

test('explain_variable usa el diccionario de Groundy (sin datos)', async () => {
  const r = await tools.run('explain_variable', { name: 'ndvi' });
  assert.equal(r.status, 'ok'); assert.equal(r.variables[0].resolution, '250 m');
  const a = await tools.run('explain_variable', { name: 'aridity' }); assert.match(a.variables[0].caveat, /no la disponibilidad de agua/i);
  assert.equal((await tools.run('explain_variable', { name: 'zzzz' })).status, 'not_found');
});
test('herramientas devuelven datos con aviso de demostración y no inventan sitios', async () => {
  const s = await tools.run('get_site_analysis', { site_id: 'demo' }, {});
  assert.equal(s.status, 'ok'); assert.match(s.demo_note, /DEMOSTRACIÓN/); assert.match(s.scale_note, /~50 km/);
  assert.equal(s.site.crops, undefined);
  assert.equal((await tools.run('get_site_analysis', { site_id: 'no-existe' }, {})).status, 'not_found');
  assert.equal((await tools.run('get_rotations', {}, {})).status, 'missing_site');
  assert.equal((await tools.run('get_rotations', {}, { siteId: 'demo' })).best_rotation[0], 'papa');
  assert.equal((await tools.run('get_crop_suitability', { site_id: 'demo', crop: 'HABA' }, {})).crops.length, 1);
  assert.equal((await tools.run('list_sites', {})).sites[0].siteId, 'demo');
});
test('el modo reglas usa los datos del sitio seleccionado y los etiqueta como demo', async () => {
  const r = await handleChat({ message: 'datos nasa', context: { siteId: 'demo' } });
  assert.equal(r.json.mode, 'rules'); assert.equal(r.json.nasaStatus, 'ok'); assert.match(r.json.reply, /demostración/); assert.ok(r.json.evidence.length);
});
test('verificador de cifras', () => {
  assert.deepEqual(guard.unverified('La lluvia es 900 mm y la aptitud 0,78 (78%).', [{ a: 900, b: 0.78 }]), []);
  assert.deepEqual(guard.unverified('Habrá 777 mm y 3 meses.', [{ a: 900 }]), ['777']);
});
test('palabras cortas no confunden temas ("drain" no es "rain", "plantas" no es siembra)', () => {
  assert.notEqual(engine.answer({ message: 'how to drain water' }).intent, 'nasa');
  assert.equal(engine.answer({ message: 'mis plantas se ven bien' }).intent, null);
  assert.equal(engine.answer({ message: 'hola' }).intent, 'saludo');
});

function mockLLM(replies) {
  const calls = []; const real = global.fetch;
  global.fetch = async (url, init) => { calls.push(JSON.parse(init.body)); const m = replies.shift(); return { ok: true, status: 200, json: async () => ({ choices: [{ message: m }] }) }; };
  process.env.LLM_PROVIDER = 'openai'; process.env.LLM_BASE_URL = 'http://x/v1'; process.env.LLM_API_KEY = 'k'; process.env.LLM_MODEL = 'm';
  return { calls, restore() { global.fetch = real; ['LLM_PROVIDER', 'LLM_BASE_URL', 'LLM_API_KEY', 'LLM_MODEL'].forEach(k => delete process.env[k]); } };
}
const toolCall = (name, args) => ({ role: 'assistant', content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name, arguments: JSON.stringify(args) } }] });

test('la IA consulta datos con herramientas y su respuesta queda verificada', async () => {
  const m = mockLLM([toolCall('get_rotations', {}), { role: 'assistant', content: 'La rotación con mayor puntaje (0,74) es papa, haba y avena. Son datos de demostración.' }]);
  try {
    const r = await handleChat({ message: '¿Qué rotación me conviene?', context: { siteId: 'demo' } });
    assert.equal(r.json.mode, 'llm'); assert.equal(r.json.verified, true); assert.deepEqual(r.json.toolsUsed, ['get_rotations']); assert.equal(r.json.basis, 'data');
    const toolMsg = m.calls[1].messages.find(x => x.role === 'tool'); assert.match(toolMsg.content, /0\.74/); assert.ok(m.calls[0].tools.length >= 5);
  } finally { m.restore(); }
});
test('si la IA inventa una cifra, se marca como no verificada', async () => {
  const m = mockLLM([toolCall('get_site_analysis', {}), { role: 'assistant', content: 'Llueven 1500 mm al año.' }]);
  try {
    const r = await handleChat({ message: 'lluvia?', context: { siteId: 'demo' } });
    assert.equal(r.json.verified, false); assert.match(r.json.notice, /1500/);
  } finally { m.restore(); }
});
test('sin datos del sitio, la IA recibe "not_found" y no hay evidencia', async () => {
  const m = mockLLM([toolCall('get_site_analysis', { site_id: 'x' }), { role: 'assistant', content: 'Todavía no tengo datos de ese sitio.' }]);
  try { const r = await handleChat({ message: 'datos de x' }); assert.deepEqual(r.json.evidence, []); assert.equal(r.json.basis, 'general'); } finally { m.restore(); }
});

test('no hay análisis de imágenes en ninguna parte', async () => {
  await new Promise(r => server.listen(0, r)); const port = server.address().port;
  const get = (p, method = 'GET') => new Promise(res => { const q = http.request({ port, path: p, method }, x => { let b = ''; x.on('data', d => b += d); x.on('end', () => res({ status: x.statusCode, body: b })); }); q.end(); });
  assert.equal((await get('/api/papanauta/image', 'POST')).status, 404);
  assert.doesNotMatch((await get('/api/papanauta/health')).body, /vision/);
  server.close();
  const files = ['web/papanauta-widget.js', 'src/engine.js', 'README.md', 'EQUIPO.md', '.env.example', 'server/index.js', 'server/chat.js'].map(f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).join('\n');
  assert.doesNotMatch(files, /imagen|im[áa]genes|visi[óo]n artificial|servicio de visi|fotos?\b|VISION_|\/image\b/i);
});
