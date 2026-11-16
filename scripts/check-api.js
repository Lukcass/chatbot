'use strict';
// Verifica la conexión con la IA: npm run check-api
const env = require('../server/env'), llm = require('../server/llm');
const v = k => process.env[k] === undefined ? '(vacío)' : /KEY/.test(k) ? `(${process.env[k].length} caracteres)` : process.env[k];
(async () => {
  console.log('Archivo .env:', env.info.found ? `encontrado en ${env.info.path} (${env.info.encoding})` : `NO encontrado en ${env.info.path}` + (env.info.txtHint ? '\n  → existe ".env.txt": renómbralo a ".env" (en el Explorador activa Ver → Extensiones de nombre de archivo).' : ''));
  const list = llm.providers();
  if (!list.length) {
    console.log('\nIA NO configurada. Esto es lo que se leyó (la clave no se muestra):');
    ['LLM_PRESET', 'LLM_PROVIDER', 'LLM_API_KEY', 'LLM_MODEL', 'LLM_BASE_URL'].forEach(k => console.log(`  ${k.padEnd(13)} ${v(k)}`));
    console.log('\nNecesitas al menos: LLM_PRESET (gemini|groq|mistral|cerebras|openrouter|anthropic), LLM_API_KEY y LLM_MODEL.');
    console.log('Si todo se ve bien arriba pero aparece "(vacío)", revisa que cada línea sea CLAVE=valor, sin espacios en el nombre y sin que el archivo sea ".env.txt".');
    process.exit(1);
  }
  console.log('Proveedores leídos:', list.map(p => `${p.name} (modelo ${p.model})`).join(', '));
  try {
    const r = await llm.ask({ system: 'Responde en una frase corta.', history: [], message: 'Di "Papanauta listo" y nada más.' });
    console.log('OK. Respuesta de la IA:', r && r.text); console.log('Reinicia el servidor: npm start (health mostrará llm:true).');
  } catch (e) { console.log('ERROR:', e.message, '\n401/403 = clave incorrecta o revocada · 404 = modelo o URL incorrectos · 429 = límite gratuito alcanzado'); process.exit(1); }
})();
