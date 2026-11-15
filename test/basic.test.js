const test = require('node:test'), assert = require('node:assert'), engine = require('../src/engine'), { handleChat } = require('../server/chat');
delete process.env.LLM_API_KEY; delete process.env.LLM_PROVIDER;
test('las 4 secciones tienen sugerencias distintas', () => {
  const sets = engine.SECTIONS.map(s => JSON.stringify(engine.SUGGESTIONS.es[s])); assert.equal(new Set(sets).size, 4);
  const r = engine.answer({ message: 'hola', context: { currentSection: 'mapa' } }); assert.deepEqual(r.suggestions, engine.SUGGESTIONS.es.mapa); });
test('funciona sin credenciales de IA (modo reglas)', async () => {
  const r = await handleChat({ message: 'como fertilizar la papa' }); assert.equal(r.json.mode, 'rules'); assert.match(r.json.reply, /análisis de suelo/); });
test('tolera errores ortográficos', () => { assert.equal(engine.answer({ message: 'fertilisacion de la papa' }).intent, 'fertilizacion'); assert.equal(engine.answer({ message: 'cuando cocechar' }).intent, 'cosecha'); });
test('no inventa datos NASA', async () => {
  const r = await handleChat({ message: '¿Cuánta lluvia hay en mi zona?' }); assert.equal(r.json.evidence.length, 0); assert.match(r.json.reply, /Todavía no tengo datos de NASA/); assert.doesNotMatch(r.json.reply, /\d+ ?mm/); });
test('usa y etiqueta datos NASA de demostración', async () => {
  const r = await handleChat({ message: 'datos nasa', context: { nasaData: { demo: true, source: 'NASA POWER', variables: { tmean_c: 12 } } } });
  assert.match(r.json.reply, /demostración/); assert.equal(r.json.evidence[0].factId, 'nasa.tmean_c'); });
test('no pronostica ni diagnostica', () => { assert.match(engine.answer({ message: 'va a llover mañana?' }).reply, /No pronostico/); assert.match(engine.answer({ message: 'qué enfermedad tiene mi planta' }).reply, /No puedo diagnosticar/); });
test('recuerda datos del usuario', async () => { const a = await handleChat({ message: 'mi suelo es arcilloso' }); const b = await handleChat({ message: 'y el suelo para papa?', memory: a.json.memory }); assert.match(b.json.reply, /arcilloso/); });
test('pregunta fuera de tema y mensaje vacío', async () => { assert.match(engine.answer({ message: 'quién ganó el mundial' }).reply, /todavía no lo sé/); assert.equal((await handleChat({ message: ' ' })).status, 400); });
test('LLM_PRESET configura proveedor y URL', () => {
  process.env.LLM_PRESET = 'gemini'; delete process.env.LLM_PROVIDER; delete process.env.LLM_BASE_URL;
  delete require.cache[require.resolve('../server/env')]; require('../server/env');
  assert.equal(process.env.LLM_PROVIDER, 'openai'); assert.match(process.env.LLM_BASE_URL, /generativelanguage/);
  delete process.env.LLM_PRESET; delete process.env.LLM_PROVIDER; delete process.env.LLM_BASE_URL; });
