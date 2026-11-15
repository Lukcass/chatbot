'use strict';
// Adaptador de IA generativa (proveedor intercambiable por variables de entorno). Sin credenciales => modo básico.
const configured = () => { const e = process.env; return !!(e.LLM_PROVIDER && e.LLM_API_KEY && e.LLM_MODEL); };
function systemPrompt(ctx, facts, chunks, lang) {
  return `Eres Papanauta, asistente agrícola de la plataforma Potatonauts. Responde en ${lang === 'en' ? 'inglés' : 'español'}, claro y breve, explicando términos técnicos.
ALCANCE: solo respondes sobre el cultivo de papa, arveja y maíz, la plataforma Potatonauts y cómo interpretar sus datos. Si preguntan otra cosa, di amablemente que no es tu tema y ofrece ayuda con lo que sí sabes.
REGLAS: no pronostiques el clima; no diagnostiques enfermedades (solo orientación y recomienda un técnico local); no des dosis sin análisis de suelo; no inventes cifras, fuentes ni datos de parcela.
No recomiendes variedades, fechas de siembra ni dosis específicas sin datos de la zona o un fragmento documental; da orientación general y sugiere consultar a un técnico local, AGROSAVIA o el ICA.
FORMATO: máximo 120 palabras, sin tablas, sin encabezados y sin listas largas. Solo puedes usar **negrita** y saltos de línea.
Distingue datos comprobados, estimaciones y recomendaciones generales. Si falta información, pregunta una sola cosa.
Datos NASA: ${facts.length ? JSON.stringify(facts) + ' (usa solo estos y cita su fuente)' : 'NO DISPONIBLES: di que aún no están conectados; no los reemplaces con otra fuente.'}
Sección actual: ${ctx.currentSection || 'inicio'}. Parcela: ${ctx.plot ? JSON.stringify(ctx.plot) : 'sin datos'}.
Fragmentos documentales (cita el archivo si los usas): ${chunks.length ? chunks.map(c => `[${c.source}] ${c.text}`).join('\n') : 'ninguno'}`;
}
async function ask({ system, history, message }) {
  if (!configured()) return null;
  const { LLM_PROVIDER, LLM_API_KEY, LLM_MODEL, LLM_BASE_URL } = process.env;
  const msgs = [...history.slice(-10), { role: 'user', content: message }];
  const opt = { method: 'POST', signal: AbortSignal.timeout(25000) };
  if (LLM_PROVIDER === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', { ...opt, headers: { 'x-api-key': LLM_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: LLM_MODEL, max_tokens: 700, system, messages: msgs }) });
    if (!r.ok) throw new Error('LLM ' + r.status); return (await r.json()).content[0].text;
  }
  if (LLM_PROVIDER === 'openai' && LLM_BASE_URL) {
    const r = await fetch(LLM_BASE_URL.replace(/\/$/, '') + '/chat/completions', { ...opt, headers: { Authorization: 'Bearer ' + LLM_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ model: LLM_MODEL, max_tokens: 1500, messages: [{ role: 'system', content: system }, ...msgs] }) });
    if (!r.ok) throw new Error('LLM ' + r.status); return (await r.json()).choices[0].message.content;
  }
  return null;
}
module.exports = { ask, configured, systemPrompt };