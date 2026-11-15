'use strict';
const engine = require('../src/engine'), llm = require('./llm'), rag = require('./rag'), nasa = require('./nasa');
// Entrada: { message, language, history:[{role,content}], memory, context:{ currentSection, userId, plot, nasaData } }
async function handleChat(body) {
  body = body || {};
  const message = String(body.message || '').trim().slice(0, 1000);
  if (!message) return { status: 400, json: { error: 'message_required' } };
  const language = body.language === 'en' ? 'en' : 'es';
  const context = Object.assign({ currentSection: 'inicio', plot: null, nasaData: null }, body.context || {});
  const history = Array.isArray(body.history) ? body.history.filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string') : [];
  let nasaStatus = context.nasaData ? 'received' : 'not_available';
  if (!context.nasaData && context.plot && context.plot.lat != null) {
    const r = await nasa.getNasaData({ lat: context.plot.lat, lon: context.plot.lon }); nasaStatus = r.status; context.nasaData = r.data; }
  const base = engine.answer({ message, context, memory: body.memory || {}, language });
  base.nasaStatus = nasaStatus;
  if (!llm.configured()) return { status: 200, json: base };
  try {
    const facts = engine.nasaFacts(context.nasaData), chunks = rag.retrieve(message);
    const text = await llm.ask({ system: llm.systemPrompt(context, facts, chunks, language), history, message });
    if (!text) return { status: 200, json: base };
    return { status: 200, json: { ...base, reply: text, mode: 'llm', basis: facts.length ? 'nasa' : 'general', evidence: facts, sources: chunks.map(c => c.source), notice: null } };
  } catch { return { status: 200, json: { ...base, notice: 'La IA no respondió; uso el modo básico.' } }; }
}
module.exports = { handleChat };
