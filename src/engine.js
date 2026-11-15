'use strict';
// Motor básico por reglas: funciona sin IA ni credenciales. Determinista.
const SUGGESTIONS = {
  es: {
    inicio: ['¿Qué debo revisar hoy?', 'Explícame esta recomendación', '¿Qué datos de NASA usa la plataforma?'],
    mapa: ['¿Qué tan fiable es este dato en mi lote?', '¿Qué significa este color?', '¿Qué datos hay de mi zona?'],
    cultivos: ['¿Por qué rotar la papa?', '¿Cuáles son las etapas del cultivo de papa?', '¿Qué cambia si mi suelo es más arcilloso?'],
    aprender: ['¿Qué es el balance hídrico?', '¿Qué es la evapotranspiración (ET0)?', '¿Cómo se calculó esta gráfica?']
  },
  en: {
    inicio: ['What should I check today?', 'Explain this recommendation', 'Which NASA data does the platform use?'],
    mapa: ['How reliable is this data for my plot?', 'What does this color mean?', 'What data exists for my area?'],
    cultivos: ['Why rotate potatoes?', 'What are the potato growth stages?', 'What changes if my soil is clayey?'],
    aprender: ['What is the water balance?', 'What is evapotranspiration (ET0)?', 'How was this chart calculated?']
  }
};
const SECTIONS = Object.keys(SUGGESTIONS.es);
const NASA_LABELS = { tmean_c: 'Temperatura media (°C)', rain_mm_yr: 'Lluvia anual (mm/año)', et0_mm_yr: 'ET0 anual (mm/año)', aridity: 'Aridez (lluvia/ET0)' };

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length]; }
function hit(text, tokens, stem) { if (text.includes(stem)) return true;
  return stem.length >= 5 && tokens.some(t => t.length >= stem.length - 1 && lev(t.slice(0, stem.length), stem) <= 1); }

function nasaFacts(nasa) {
  const v = nasa && nasa.variables; if (!v || !Object.keys(v).length) return [];
  return Object.entries(v).filter(([, x]) => x !== null && x !== undefined).map(([k, x]) => ({ factId: 'nasa.' + k, label: NASA_LABELS[k] || k, value: x, source: (nasa.source || 'NASA') + (nasa.period ? ' · ' + nasa.period : '') + (nasa.demo ? ' · DATOS DE DEMOSTRACIÓN' : '') }));
}
const NO_NASA = 'Todavía no tengo datos de NASA conectados para esta zona, así que no puedo darte cifras. Cuando la plataforma me los envíe, te los explicaré con su fuente.';
const G = t => ({ text: t, basis: 'general' });

const INTENTS = [
  { id: 'saludo', keys: ['hola', 'buenas', 'buenos dias', 'hello'], run: () => ({ text: '¡Hola! Soy Papanauta, tu guía para el cultivo de papa. Puedo explicarte siembra, suelo, riego, rotación, plagas y cómo leer los datos de la plataforma.', basis: 'none' }) },
  { id: 'pronostico', keys: ['pronostic', 'va a llover', 'llovera', 'manana llov', 'proxima semana', 'forecast', 'will it rain'], run: () => ({ text: 'No pronostico el clima. Puedo mostrarte qué pasó en años anteriores y explicarte qué significa para el cultivo.', basis: 'none' }) },
  { id: 'diagnostico', keys: ['que enfermedad', 'que plaga', 'diagnostic', 'manchas', 'se estan secando', 'hojas amarill', 'mi planta tiene'], run: () => G('No puedo diagnosticar a distancia. Como orientación general en papa: el **tizón tardío** suele aparecer con humedad alta y frío, y en zonas andinas el **gorgojo de los Andes** daña el tubérculo. Para confirmar, consulta a un técnico agrícola local. El análisis de fotos aún no está habilitado.') },
  { id: 'nasa', keys: ['nasa', 'satelit', 'datos de mi zona', 'que datos', 'what data', 'which nasa', 'clima de mi', 'temperatura', 'lluvia', 'rain'], run: (c) => { const f = nasaFacts(c.nasaData);
      if (!f.length) return { text: NO_NASA, basis: 'none' };
      return { text: (c.nasaData.demo ? '**Datos de demostración** (no son reales). ' : 'Según los datos NASA recibidos: ') + f.map(x => `${x.label}: **${x.value}**`).join(' · ') + '.', basis: 'nasa', evidence: f }; } },
  { id: 'fiabilidad', keys: ['fiable', 'confiable', 'reliable', 'que tan seguro'], run: (c) => { const f = nasaFacts(c.nasaData);
      return { text: 'Los datos satelitales describen una **celda amplia**, no tu lote exacto. Sirven como referencia y se mejoran con lo que tú declares del suelo y la parcela. ' + (f.length ? '' : NO_NASA), basis: f.length ? 'nasa' : 'general', evidence: f }; } },
  { id: 'color', keys: ['que significa este color', 'significa el color', 'leyenda', 'what does this color'], run: () => ({ text: 'El color depende de la capa activa en el mapa; la leyenda indica la escala. Todavía no recibo la capa seleccionada desde la pantalla; dime qué capa ves y te la explico.', basis: 'none' }) },
  { id: 'balance', keys: ['balance hidric', 'water balance'], run: () => G('El **balance hídrico** compara el agua que entra (lluvia, riego) con la que el cultivo y el suelo pierden (evapotranspiración). Si la lluvia no alcanza, hay déficit y la planta sufre.') },
  { id: 'et0', keys: ['evapotranspir', 'et0'], run: () => G('La **evapotranspiración de referencia (ET0)** es el agua que perdería un cultivo bien regado por evaporación del suelo y transpiración de la planta. Se usa para estimar cuánta agua necesita.') },
  { id: 'grafica', keys: ['como se calculo', 'esta grafica', 'how was this'], run: () => ({ text: 'Cada gráfica debe indicar su fuente, periodo y tamaño de celda. Todavía no recibo los detalles de la gráfica abierta; cuando la web me los envíe, te explicaré el cálculo.', basis: 'none' }) },
  { id: 'rotacion', keys: ['rotar', 'rotacion', 'rotation', 'secuencia', 'que sembrar despues', 'recomendacion', 'recommendation'], run: () => G('**Rotar** evita repetir papa en el mismo lote: se cortan ciclos de plagas y enfermedades del suelo y se cuida su materia orgánica. Lo habitual es alternar familias (tras papa, una leguminosa o un cereal) y esperar varias temporadas antes de volver a papa.') },
  { id: 'etapas', keys: ['etapa', 'fase', 'ciclo', 'stages'], run: () => G('Etapas generales de la papa: **brotación**, **emergencia y crecimiento vegetativo**, **inicio de tuberización**, **llenado del tubérculo** y **maduración**. La necesidad de agua es más sensible en tuberización y llenado.') },
  { id: 'siembra', keys: ['siembr', 'sembr', 'plantar', 'semilla', 'planting'], run: () => G('Usa **semilla sana y certificada**, en suelo bien preparado y no encharcado. Siembra cuando haya humedad suficiente y se evite el frío extremo. Dime tu altitud y época y afino la orientación.') },
  { id: 'suelo', keys: ['suelo', 'arcill', 'arenos', 'soil', 'clay'], run: (c, m) => G('La papa prefiere suelo suelto, con buen drenaje, rico en materia orgánica y ligeramente ácido. ' + (m.soil === 'arcilloso' ? 'Como tu suelo es **arcilloso**, retiene agua y se compacta: conviene mejorar el drenaje y evitar laborear mojado. ' : '') + 'Un análisis de laboratorio es lo más confiable.') },
  { id: 'fertilizacion', keys: ['fertiliz', 'abono', 'nutrient', 'compost'], run: () => G('La fertilización debe basarse en un **análisis de suelo**. En general la papa responde a nitrógeno, fósforo y potasio, y la materia orgánica ayuda. No doy dosis sin datos de tu suelo.') },
  { id: 'riego', keys: ['riego', 'regar', 'agua', 'irrigat', 'sequia'], run: () => G('La papa necesita humedad **constante**: la falta de agua en tuberización reduce el rendimiento y el exceso favorece enfermedades. Evita encharcar y riega según la etapa.') },
  { id: 'plagas', keys: ['plaga', 'enfermedad', 'tizon', 'gorgojo', 'pest', 'blight'], run: () => G('Problemas frecuentes en papa: **tizón tardío** (hongo, con humedad y frío), **gorgojo de los Andes** y polillas. La prevención incluye semilla sana, rotación, buen drenaje y monitoreo. Para tratar, consulta a un técnico local.') },
  { id: 'cosecha', keys: ['cosech', 'harvest', 'madur'], run: () => G('Se cosecha cuando el follaje se seca y la cáscara del tubérculo ya no se desprende fácil. Cosechar en suelo no muy húmedo reduce daños y pudriciones.') },
  { id: 'inicio', keys: ['que debo revisar', 'what should i check'], run: (c) => ({ text: 'Hoy conviene revisar: 1) la humedad del lote, 2) señales de plagas o enfermedad en hojas, 3) el estado del suelo. ' + (nasaFacts(c.nasaData).length ? '' : NO_NASA), basis: 'general' }) }
];

function extractMemory(msg, mem) {
  const t = norm(msg), m = Object.assign({}, mem); let r;
  if ((r = t.match(/(\d+(?:[.,]\d+)?)\s*(?:ha\b|hectarea)/))) m.areaHa = parseFloat(r[1].replace(',', '.'));
  if ((r = t.match(/(\d{3,4})\s*(?:msnm|m\.s\.n\.m|metros sobre)/))) m.altitudeM = +r[1];
  if ((r = t.match(/arcill|arenos|franco|limos/))) m.soil = { arcill: 'arcilloso', arenos: 'arenoso', franco: 'franco', limos: 'limoso' }[r[0]];
  return m;
}
function answer({ message, context = {}, memory = {}, language = 'es' }) {
  const ctx = context || {}, mem = extractMemory(message, memory);
  const text = norm(message), tokens = text.split(/[^a-z0-9]+/).filter(Boolean);
  let best = null, score = 0;
  for (const it of INTENTS) { const s = it.keys.filter(k => hit(text, tokens, k)).length; if (s > score) { best = it; score = s; } }
  const lang = SUGGESTIONS[language] ? language : 'es';
  const sec = SECTIONS.includes(ctx.currentSection) ? ctx.currentSection : 'inicio';
  const out = best ? best.run(ctx, mem) : { text: 'Eso todavía no lo sé. Puedo ayudarte con estos temas:', basis: 'none' };
  return { reply: out.text, basis: out.basis, evidence: out.evidence || [], intent: best ? best.id : null, memory: mem, suggestions: SUGGESTIONS[lang][sec], mode: 'rules',
    notice: lang === 'en' ? 'Basic mode answers in Spanish.' : null };
}
module.exports = { answer, SUGGESTIONS, SECTIONS, nasaFacts, extractMemory };
