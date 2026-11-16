const test = require('node:test'), assert = require('node:assert');
const { handleChat } = require('../server/chat'), limits = require('../server/limits'), cache = require('../server/cache');
const KEYS = ['LLM_PROVIDER', 'LLM_BASE_URL', 'LLM_API_KEY', 'LLM_MODEL', 'LLM_PRESET', 'LLM_PROVIDER_2', 'LLM_BASE_URL_2', 'LLM_API_KEY_2', 'LLM_MODEL_2', 'LLM_RPM', 'LLM_PER_USER_HOUR', 'LLM_CONCURRENCY', 'LLM_QUEUE_WAIT_MS', 'CACHE_TTL_MIN'];
const ok = content => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { role: 'assistant', content } }] }) });
function setup(handler, env = {}) {
  limits.reset(); cache.clear(); const real = global.fetch, urls = [];
  global.fetch = async (url, init) => { urls.push(String(url)); return handler(String(url), JSON.parse(init.body)); };
  Object.assign(process.env, { LLM_PROVIDER: 'openai', LLM_BASE_URL: 'http://a/v1', LLM_API_KEY: 'k', LLM_MODEL: 'm' }, env);
  return { urls, done() { global.fetch = real; KEYS.forEach(k => delete process.env[k]); limits.reset(); cache.clear(); } };
}

test('las preguntas sugeridas (chips) se responden sin gastar IA', async () => {
  const s = setup(() => ok('no debería llamarse'));
  try { const r = await handleChat({ message: '¿Por qué rotar la papa?', context: { currentSection: 'cultivos' } }); assert.equal(r.json.mode, 'rules'); assert.equal(r.json.routed, 'chip'); assert.match(r.json.reply, /Rotar/); assert.equal(s.urls.length, 0); }
  finally { s.done(); }
});
test('caché: la misma pregunta de varios usuarios cuesta una sola llamada', async () => {
  const s = setup(() => ok('Respuesta de IA.'));
  try {
    const a = await handleChat({ message: 'cuéntame sobre el cultivo de quinua', context: { userId: 'u1' } });
    const b = await handleChat({ message: '  Cuéntame sobre el cultivo de QUINUA! ', context: { userId: 'u2' } });
    assert.equal(a.json.mode, 'llm'); assert.equal(b.json.cached, true); assert.equal(b.json.reply, 'Respuesta de IA.'); assert.equal(s.urls.length, 1);
    const c = await handleChat({ message: 'cuéntame sobre el cultivo de quinua', history: [{ role: 'user', content: 'hola' }], context: { userId: 'u3' } });
    assert.equal(c.json.cached, undefined); assert.equal(s.urls.length, 2); // con historial no se reutiliza
  } finally { s.done(); }
});
test('respaldo: si el proveedor principal da 429, responde el siguiente', async () => {
  const s = setup(url => url.startsWith('http://a/') ? { ok: false, status: 429, headers: { get: () => '30' }, json: async () => ({}) } : ok('Respondió el respaldo.'),
    { LLM_PROVIDER_2: 'openai', LLM_BASE_URL_2: 'http://b/v1', LLM_API_KEY_2: 'k2', LLM_MODEL_2: 'm2' });
  try {
    const r = await handleChat({ message: 'pregunta uno sobre cebada' }); assert.equal(r.json.reply, 'Respondió el respaldo.'); assert.deepEqual(s.urls, ['http://a/v1/chat/completions', 'http://b/v1/chat/completions']);
    await handleChat({ message: 'pregunta dos sobre trigo' }); assert.equal(s.urls[2], 'http://b/v1/chat/completions'); // el principal quedó enfriado: no se vuelve a golpear
  } finally { s.done(); }
});
test('sin cupo en ningún proveedor: modo básico con aviso (no error)', async () => {
  const s = setup(() => ok('x'), { LLM_RPM: '1' });
  try {
    await handleChat({ message: 'primera pregunta distinta sobre avena' });
    const r = await handleChat({ message: 'segunda pregunta distinta sobre centeno' });
    assert.equal(r.status, 200); assert.equal(r.json.mode, 'rules'); assert.equal(r.json.degraded, 'busy'); assert.match(r.json.notice, /demanda/);
  } finally { s.done(); }
});
test('cupo por usuario: al pasarse no se bloquea, sigue en modo básico y no afecta a otros', async () => {
  const s = setup(() => ok('IA.'), { LLM_PER_USER_HOUR: '2', LLM_RPM: '100' });
  try {
    const q = n => handleChat({ message: 'pregunta número ' + n + ' sobre sorgo', context: { userId: 'abusador' } });
    assert.equal((await q(1)).json.mode, 'llm'); assert.equal((await q(2)).json.mode, 'llm');
    const r = await q(3); assert.equal(r.status, 200); assert.equal(r.json.degraded, 'user_quota'); assert.equal(r.json.mode, 'rules');
    assert.equal((await handleChat({ message: 'otra pregunta sobre sorgo', context: { userId: 'otro' } })).json.mode, 'llm');
  } finally { s.done(); }
});
test('concurrencia: lo que excede la cola pasa a modo básico y los demás se atienden', async () => {
  let release; const gate = new Promise(r => release = r);
  const s = setup(async () => { await gate; return ok('IA lenta.'); }, { LLM_CONCURRENCY: '1', LLM_QUEUE_WAIT_MS: '50', LLM_RPM: '100', LLM_PER_USER_HOUR: '0' });
  try {
    const p1 = handleChat({ message: 'consulta lenta uno sobre papa criolla' });
    await new Promise(r => setTimeout(r, 10));
    const r2 = await handleChat({ message: 'consulta dos sobre papa pastusa' });
    assert.equal(r2.json.degraded, 'busy'); release();
    assert.equal((await p1).json.mode, 'llm');
  } finally { release(); s.done(); }
});
