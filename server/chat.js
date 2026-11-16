'use strict';
const inflight = new Map(); // preguntas idénticas que llegan a la vez comparten UNA sola llamada a la IA
const engine = require('../src/engine'), llm = require('./llm'), rag = require('./rag'), tools = require('./data/tools'), guard = require('./guard'), limits = require('./limits'), cache = require('./cache');
// Entrada: { message, language, history:[{role,content}], memory, context:{ currentSection, userId, siteId, plot, nasaData } }
// opts.ip: IP del cliente (para repartir el cupo cuando no hay userId).
// Orden para cuidar el cupo de IA: 1) pregunta sugerida (chip) → reglas  2) caché  3) cupo del usuario  4) cola/concurrencia  5) proveedores en cascada  6) reglas.
async function handleChat(body, opts = {}) {
  body = body || {};
  const message = String(body.message || '').trim().slice(0, 1000);
  if (!message) return { status: 400, json: { error: 'message_required' } };
  const language = body.language === 'en' ? 'en' : 'es';
  const context = Object.assign({ currentSection: 'inicio', siteId: null, plot: null, nasaData: null }, body.context || {});
  const history = (Array.isArray(body.history) ? body.history : []).filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string').slice(-10).map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
  let nasaStatus = context.nasaData ? 'received' : 'not_available';
  if (!context.nasaData && (context.siteId || context.plot)) {
    const r = await tools.resolveSite({}, context); nasaStatus = r.status;
    if (r.status === 'ok') context.nasaData = tools.toNasaData(r.data);
  }
  const base = engine.answer({ message, context, memory: body.memory || {}, language });
  base.nasaStatus = nasaStatus;
  const degrade = (reason, notice) => ({ status: 200, json: { ...base, degraded: reason, notice: language === 'en' ? 'High demand: showing basic answers for now.' : notice } });
  if (!llm.configured()) return { status: 200, json: base };
  // 1) Las preguntas sugeridas (botones) se responden con el motor de reglas: son la mayoría del tráfico y no gastan IA.
  if (engine.isSuggestion(message, language) && process.env.LLM_ON_CHIPS !== '1') return { status: 200, json: { ...base, routed: 'chip' } };
  // 2) Caché de preguntas autocontenidas (sin historial ni memoria): una respuesta de IA sirve a todos.
  const standalone = !history.length && !Object.keys(body.memory || {}).length, ckey = cache.key(message, language, context);
  if (standalone) { const hit = cache.get(ckey); if (hit) return { status: 200, json: { ...hit, cached: true } }; }
  let settle = null, leader = false;
  if (standalone) {
    const flight = inflight.get(ckey);
    if (flight) { const j = await flight; if (j) return { status: 200, json: { ...j, cached: true } }; }
    else { leader = true; inflight.set(ckey, new Promise(r => { settle = r; })); }
  }
  // 3) Cupo por usuario por hora: al pasarse no se bloquea, solo pasa al modo básico.
  let release = null;
  try {
    if (!limits.allowUser(context.userId || opts.ip || 'anon')) return degrade('user_quota', 'Llegaste al límite de respuestas con IA por ahora; sigo ayudándote en modo básico.');
    // 4) Concurrencia: si hay demasiadas consultas a la vez, cola corta y luego modo básico.
    release = await limits.acquire(); if (!release) return degrade('busy', 'Hay mucha demanda ahora; te respondo en modo básico.');
    const facts = engine.nasaFacts(context.nasaData), chunks = rag.retrieve(message);
    // 5) Proveedores en cascada con cupo por minuto; 6) si todos fallan → modo básico.
    const r = await llm.ask({ system: llm.systemPrompt(context, facts, chunks, language), history, message, tools: tools.definitions, runTool: (n, a) => tools.run(n, a, context) });
    if (!r || !r.text) return { status: 200, json: base };
    const evidence = [...facts, ...tools.evidenceFrom(r.toolResults)];
    const gotData = r.toolResults.some(t => t.result && t.result.status === 'ok' && t.name !== 'explain_variable');
    const bad = guard.unverified(r.text, [r.toolResults, facts, message, history.map(m => m.content), context.plot || '']);
    const json = { ...base, reply: r.text, mode: 'llm', basis: gotData || facts.length ? 'data' : 'general', evidence, sources: chunks.map(c => c.source),
      verified: bad.length === 0, notice: bad.length ? `No pude verificar estas cifras con los datos: ${bad.join(', ')}. Revisa el panel de la plataforma.` : null, toolsUsed: r.toolResults.map(t => t.name) };
    if (standalone && json.verified) cache.set(ckey, json);
    if (settle) settle(json);
    return { status: 200, json };
  } catch (e) {
    return e && e.busy ? degrade('busy', 'Hay mucha demanda ahora; te respondo en modo básico.') : { status: 200, json: { ...base, degraded: 'llm_error', notice: 'La IA no respondió; uso el modo básico.' } };
  } finally { if (release) release(); if (leader) { inflight.delete(ckey); settle(null); } }
}
module.exports = { handleChat };
