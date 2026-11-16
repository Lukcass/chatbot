'use strict';
// Adaptador de IA generativa con VARIOS proveedores en cascada (failover) y function calling.
// Define hasta 4 proveedores: LLM_*, LLM_*_2, LLM_*_3, LLM_*_4. Si el primero está sin cupo o falla, se usa el siguiente.
// Requiere modelos con soporte de herramientas. Sin ninguno configurado => modo básico.
const { PRESETS } = require('./env'), limits = require('./limits');
const MAX_STEPS = 4;
function providers() {
  const e = process.env, out = [];
  ['', '_2', '_3', '_4'].forEach((s, i) => {
    const key = e['LLM_API_KEY' + s], model = e['LLM_MODEL' + s], rawKind = (e['LLM_PROVIDER' + s] || '').toLowerCase();
    let kind = rawKind === 'openai' || rawKind === 'anthropic' ? rawKind : '', base = e['LLM_BASE_URL' + s];
    const preset = (e['LLM_PRESET' + s] || (PRESETS[rawKind] || rawKind === 'anthropic' ? rawKind : '')).toLowerCase(); // "groq" en LLM_PROVIDER se tolera como preset
    if (!kind && preset) { if (preset === 'anthropic') kind = 'anthropic'; else if (PRESETS[preset]) { kind = 'openai'; base = base || PRESETS[preset]; } }
    if (key && model && (kind === 'anthropic' || (kind === 'openai' && base))) out.push({ idx: i, kind, key, model, base, rpm: +e['LLM_RPM' + s] || 10, name: preset || kind });
  });
  return out;
}
const configured = () => providers().length > 0;
function systemPrompt(ctx, facts, chunks, lang) {
  return `Eres Papanauta, asistente agrícola de la plataforma Potatonauts. Responde en ${lang === 'en' ? 'inglés' : 'español'}, claro y breve, explicando términos técnicos con palabras sencillas.
ALCANCE: cultivo de papa, arveja y maíz, la plataforma Potatonauts y cómo interpretar sus datos y análisis. Si preguntan otra cosa, di amablemente que no es tu tema y ofrece lo que sí sabes.
DATOS: toda cifra de un sitio, cultivo o rotación sale SOLO de las herramientas (get_site_analysis, get_crop_suitability, get_rotations, explain_variable, list_sites). Llámalas cuando pregunten por datos, análisis, aptitud o rotaciones. Nunca inventes, estimes, redondees de más ni calcules cifras; no hagas aritmética ni conversiones. Si una herramienta dice que no hay datos, dilo y no lo reemplaces con otra fuente. Si el resultado trae demo_note, avisa que son datos de demostración. Cita siempre la fuente y la resolución (p. ej. "NASA POWER, celda de ~50 km, no de tu lote"). Si un resultado trae note, transmítela (escenario para explorar, pendiente de validación agronómica).
REGLAS: no pronostiques el clima; no diagnostiques enfermedades (orientación y recomienda un técnico local); no des dosis sin análisis de suelo; no inventes cifras, fuentes ni datos de parcela. No des como orden una variedad, fecha de siembra o rotación: preséntalas como escenarios para explorar y sugiere consultar a un técnico local, AGROSAVIA o el ICA.
FORMATO: máximo 150 palabras, sin tablas ni encabezados ni listas largas. Solo **negrita** y saltos de línea.
Distingue datos comprobados (de herramientas), estimaciones y recomendaciones generales. Si falta información, pregunta una sola cosa.
Datos que la pantalla ya muestra al usuario: ${facts.length ? JSON.stringify(facts) : 'ninguno'}.
Sección actual: ${ctx.currentSection || 'inicio'}. Parcela/sitio seleccionado: ${ctx.plot ? JSON.stringify(ctx.plot) : ctx.siteId || 'ninguno'}.
Fragmentos documentales (cita el archivo si los usas): ${chunks.length ? chunks.map(c => `[${c.source}] ${c.text}`).join('\n') : 'ninguno'}`;
}
const post = async (p, url, headers, body) => {
  limits.note(p.idx);
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(25000) });
  if (!r.ok) { const e = new Error('LLM ' + r.status); e.status = r.status; e.retryAfter = +(r.headers && r.headers.get && r.headers.get('retry-after')) || 0; throw e; }
  return r.json();
};
async function askWith(p, { system, history, message, tools, runTool }) {
  const maxTokens = +process.env.LLM_MAX_TOKENS || 1200, useTools = !!(tools.length && runTool), used = [];
  const exec = async (name, args) => { let result; try { result = await runTool(name, args); } catch { result = { status: 'error', message: 'La herramienta falló.' }; } used.push({ name, args, result }); return result; };
  const conv = [...history.slice(-10), { role: 'user', content: message }]; let text = null;
  if (p.kind === 'anthropic') {
    for (let i = 0; i < MAX_STEPS; i++) {
      const j = await post(p, 'https://api.anthropic.com/v1/messages', { 'x-api-key': p.key, 'anthropic-version': '2023-06-01' },
        { model: p.model, max_tokens: maxTokens, system, messages: conv, ...(useTools ? { tools: tools.map(t => ({ name: t.name, description: t.description, input_schema: t.parameters })) } : {}) });
      const calls = (j.content || []).filter(b => b.type === 'tool_use');
      if (!calls.length) { text = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim(); break; }
      conv.push({ role: 'assistant', content: j.content });
      conv.push({ role: 'user', content: await Promise.all(calls.map(async c => ({ type: 'tool_result', tool_use_id: c.id, content: JSON.stringify(await exec(c.name, c.input || {})) }))) });
    }
  } else {
    const msgs = [{ role: 'system', content: system }, ...conv];
    for (let i = 0; i < MAX_STEPS; i++) {
      const j = await post(p, p.base.replace(/\/$/, '') + '/chat/completions', { Authorization: 'Bearer ' + p.key },
        { model: p.model, max_tokens: maxTokens, messages: msgs, ...(useTools ? { tools: tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })), tool_choice: 'auto' } : {}) });
      const m = j.choices && j.choices[0] && j.choices[0].message; if (!m) break;
      if (!m.tool_calls || !m.tool_calls.length) { text = (m.content || '').trim(); break; }
      msgs.push({ role: 'assistant', content: m.content || null, tool_calls: m.tool_calls });
      for (const c of m.tool_calls) { let a = {}; try { a = JSON.parse(c.function.arguments || '{}'); } catch { /* argumentos inválidos */ }
        msgs.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(await exec(c.function.name, a)) }); }
    }
  }
  return { text: text || null, toolResults: used };
}
// Devuelve { text, toolResults, provider } | null (sin IA configurada). Lanza Error con .busy=true si todos están sin cupo.
async function ask(args) {
  const list = providers(); if (!list.length) return null;
  args = { history: [], tools: [], ...args }; let last = null;
  for (const p of list) {
    if (!limits.available(p.idx, p.rpm)) continue;
    try { return { ...(await askWith(p, args)), provider: p.name }; } catch (e) { last = e; limits.penalize(p.idx, e); }
  }
  if (last) throw last;
  const e = new Error('LLM_BUSY'); e.busy = true; throw e;
}
module.exports = { ask, configured, systemPrompt, providers };
