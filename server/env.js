'use strict';
// Carga .env (sin dependencias, no pisa variables ya definidas) y aplica LLM_PRESET.
const fs = require('fs'), path = require('path');
const f = path.join(__dirname, '..', '.env');
if (fs.existsSync(f)) for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(?:#.*)?$/); if (m && m[2] && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
// Presets: solo pones LLM_PRESET + LLM_API_KEY + LLM_MODEL. Confirma las URL en la documentación de cada proveedor.
const PRESETS = { gemini: 'https://generativelanguage.googleapis.com/v1beta/openai', mistral: 'https://api.mistral.ai/v1', cerebras: 'https://api.cerebras.ai/v1',
  groq: 'https://api.groq.com/openai/v1', openrouter: 'https://openrouter.ai/api/v1' };
const p = (process.env.LLM_PRESET || '').toLowerCase();
if (p === 'anthropic') process.env.LLM_PROVIDER = process.env.LLM_PROVIDER || 'anthropic';
else if (PRESETS[p]) { process.env.LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai'; process.env.LLM_BASE_URL = process.env.LLM_BASE_URL || PRESETS[p]; }
module.exports = { PRESETS };
