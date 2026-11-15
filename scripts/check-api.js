'use strict';
// Verifica la conexión con la IA: npm run check-api
require('../server/env');
const llm = require('../server/llm');
(async () => {
  if (!llm.configured()) { console.log('IA NO configurada. Define en .env: LLM_PRESET (o LLM_PROVIDER + LLM_BASE_URL), LLM_API_KEY y LLM_MODEL.'); process.exit(1); }
  try {
    const t = await llm.ask({ system: 'Responde en una frase corta.', history: [], message: 'Di "Papanauta listo" y nada más.' });
    console.log('OK. Respuesta de la IA:', t); console.log('Reinicia el servidor: npm start (health mostrará llm:true).');
  } catch (e) { console.log('ERROR:', e.message, '\n401/403 = clave incorrecta · 404 = modelo o URL incorrectos · 429 = límite gratuito alcanzado'); process.exit(1); }
})();
