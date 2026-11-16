'use strict';
// Carga .env (sin dependencias, no pisa variables ya definidas) y aplica LLM_PRESET.
// Tolera: BOM, UTF-16 (PowerShell/Notepad), saltos de línea de Windows, y un LLM_PROVIDER con nombre de preset (p. ej. "groq").
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '..', '.env');
const info = { path: FILE, found: fs.existsSync(FILE), txtHint: !fs.existsSync(FILE) && fs.existsSync(FILE + '.txt'), encoding: 'utf8' };
function readText(file) {
  const b = fs.readFileSync(file);
  if (b[0] === 0xFF && b[1] === 0xFE) { info.encoding = 'utf16le'; return b.toString('utf16le').replace(/^\uFEFF/, ''); }
  if (b[0] === 0xFE && b[1] === 0xFF) { info.encoding = 'utf16be'; return Buffer.from(b).swap16().toString('utf16le').replace(/^\uFEFF/, ''); }
  return b.toString('utf8').replace(/^\uFEFF/, '');
}
if (info.found) for (const l of readText(FILE).split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(?:#.*)?$/); if (m && m[2] && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
// Presets: solo pones LLM_PRESET + LLM_API_KEY + LLM_MODEL. Confirma las URL en la documentación de cada proveedor.
const PRESETS = { gemini: 'https://generativelanguage.googleapis.com/v1beta/openai', mistral: 'https://api.mistral.ai/v1', cerebras: 'https://api.cerebras.ai/v1',
  groq: 'https://api.groq.com/openai/v1', openrouter: 'https://openrouter.ai/api/v1' };
// LLM_PROVIDER solo admite "openai" o "anthropic". Si traen otro valor (p. ej. "groq"), se interpreta como preset.
const rawProv = (process.env.LLM_PROVIDER || '').toLowerCase();
if (rawProv && rawProv !== 'openai' && rawProv !== 'anthropic') { if (!process.env.LLM_PRESET && (PRESETS[rawProv])) process.env.LLM_PRESET = rawProv; delete process.env.LLM_PROVIDER; }
const p = (process.env.LLM_PRESET || '').toLowerCase();
if (p === 'anthropic') process.env.LLM_PROVIDER = process.env.LLM_PROVIDER || 'anthropic';
else if (PRESETS[p]) { process.env.LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai'; process.env.LLM_BASE_URL = process.env.LLM_BASE_URL || PRESETS[p]; }
module.exports = { PRESETS, info };
