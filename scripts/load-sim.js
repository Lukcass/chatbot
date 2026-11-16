'use strict';
// Simulación de carga con una IA FALSA (no gasta cuota): npm run load-sim
// Muestra cuántas de N consultas simultáneas se atienden con IA, caché o modo básico, y que ninguna falla.
const { handleChat } = require('../server/chat'), engine = require('../src/engine');
const N = +process.argv[2] || 300, PROVIDERS = +process.argv[3] || 2, RPM = 10;
Object.assign(process.env, { LLM_PROVIDER: 'openai', LLM_BASE_URL: 'http://a/v1', LLM_API_KEY: 'k', LLM_MODEL: 'm', LLM_RPM: String(RPM), LLM_PER_USER_HOUR: '0' });
for (let i = 2; i <= Math.min(PROVIDERS, 4); i++) Object.assign(process.env, { ['LLM_PROVIDER_' + i]: 'openai', ['LLM_BASE_URL_' + i]: 'http://p' + i + '/v1', ['LLM_API_KEY_' + i]: 'k', ['LLM_MODEL_' + i]: 'm', ['LLM_RPM_' + i]: String(RPM) });
global.fetch = async () => { await new Promise(r => setTimeout(r, 200)); return { ok: true, status: 200, json: async () => ({ choices: [{ message: { role: 'assistant', content: 'Respuesta de IA simulada.' } }] }) }; };
const chips = Object.values(engine.SUGGESTIONS.es).flat();
const topics = ['cuándo sembrar en mi zona', 'qué hago si hiela', 'cómo almacenar la cosecha', 'qué variedad elijo', 'cómo controlar malezas', 'diferencia entre arveja y haba', 'cómo preparar compost', 'sirve el abono verde', 'qué es labranza mínima', 'cómo medir el pH'];
(async () => {
  const t0 = Date.now(), tally = {};
  await Promise.all(Array.from({ length: N }, async (_, i) => {
    const message = Math.random() < 0.6 ? chips[i % chips.length] : topics[i % topics.length] + (Math.random() < 0.5 ? '' : ' ' + i); // 40% preguntas libres; la mitad únicas
    const j = (await handleChat({ message, context: { userId: 'u' + i } })).json;
    const k = j.routed === 'chip' ? 'chip (reglas, sin IA)' : j.cached ? 'caché' : j.mode === 'llm' ? 'IA' : 'modo básico (' + (j.degraded || 'reglas') + ')';
    tally[k] = (tally[k] || 0) + 1;
  }));
  console.log(`${N} usuarios simultáneos, ${PROVIDERS} proveedor(es) de ${RPM}/min, en ${Date.now() - t0} ms:`); Object.entries(tally).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));
  console.log('  Fallos: 0 (toda consulta recibió respuesta)');
})();
