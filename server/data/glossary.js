'use strict';
// Glosario de variables de Groundy (fuente: Groundy_Diccionario_Variables.docx). Es texto fijo, no datos: Papanauta puede
// explicar qué significa cada variable aunque todavía no haya datos de ningún sitio.
// Formato: clave: [nombre, unidad, resolución, fuente, significado, advertencia]
const V = {
  tmean_c: ['Temperatura media del aire', '°C', '~50 km', 'NASA POWER', 'Temperatura media del aire.', 'Valor de una celda amplia, no de la parcela.'],
  rain_mm_yr: ['Lluvia total anual (POWER)', 'mm/año', '~50 km', 'NASA POWER', 'Lluvia acumulada en un año según POWER.', 'Valor regional; puede diferir de IMERG.'],
  et0_mm_yr: ['Evapotranspiración de referencia (FAO-56)', 'mm/año', '~50 km', 'NASA POWER', 'Cuánta agua pierde un cultivo bien regado por evaporación y transpiración.', ''],
  aridity: ['Índice de aridez', 'adimensional', '~50 km', 'NASA POWER', 'Lluvia dividida entre ET0. Menor que 1 es seco; mayor que 1 es húmedo.', 'Es un indicador climático, no la disponibilidad de agua para la planta (eso depende de etapa, suelo y Kc).'],
  ndvi: ['NDVI (MODIS)', 'adimensional (-1 a 1)', '250 m', 'MODIS MOD13Q1', 'Verdor y vigor de la vegetación. Cerca de 1 es vegetación densa; cerca de 0, suelo desnudo.', '12 valores mensuales; a 250 m mezcla coberturas.'],
  evi: ['EVI (MODIS)', 'adimensional', '250 m', 'MODIS MOD13Q1', 'Similar al NDVI pero más estable en vegetación densa.', '12 valores mensuales.'],
  lst_c: ['Temperatura de la superficie terrestre', '°C', '1 km', 'MODIS MOD11A2', 'Temperatura del suelo/superficie vista desde el satélite.', 'No es la temperatura del aire: no debe usarse como clima.'],
  sm_surf: ['Humedad del suelo superficial', 'm³/m³', '~9 km', 'SMAP L4', 'Humedad en los primeros ~5 cm de suelo.', 'Valor regional (~9 km), no de una finca pequeña.'],
  sm_root: ['Humedad del suelo en la zona de raíces', 'm³/m³', '~9 km', 'SMAP L4', 'Humedad en la zona donde están las raíces.', 'Valor regional (~9 km), no de una finca pequeña.'],
  rain_imerg: ['Lluvia mensual satelital', 'mm/mes', '~10 km', 'GPM IMERG v07', 'Lluvia estimada por satélite, mes a mes.', ''],
  rain_imerg_mm_yr: ['Lluvia anual satelital', 'mm/año', '~10 km', 'GPM IMERG v07', 'Lluvia total anual estimada por satélite.', ''],
  rain_range_mm: ['Rango de lluvia entre POWER e IMERG', 'mm/año', '-', 'Derivado', 'Diferencia entre las dos fuentes de lluvia.', 'Muestra incertidumbre entre fuentes; no dice cuál falla.'],
  elevacion_m: ['Elevación', 'm', '30 m', 'SRTM', 'Altura sobre el nivel del mar.', 'Varía dentro de la finca.'],
  pendiente_grados: ['Pendiente', 'grados', '30 m', 'SRTM', 'Inclinación del terreno.', 'Solo en análisis de área.'],
  ndvi_sentinel2_10m: ['NDVI Sentinel-2', 'adimensional', '10 m', 'Sentinel-2 SR Harmonized (no es NASA)', 'NDVI de alta resolución dentro de la finca.', 'Solo en análisis de área; con máscara estricta de nubes.'],
  suit: ['Aptitud del cultivo', '0 a 1', '-', 'Groundy (FAO EcoCrop)', 'Qué tan bien encaja un cultivo con el sitio según temperatura y lluvia.', 'Valores por especie, no por variedad. Pendiente de validación agronómica.'],
  best_month_es: ['Mejor mes de siembra', 'mes', '-', 'Groundy', 'Mejor mes de siembra según el clima.', 'Es una estimación climática, no un pronóstico.'],
  limiting: ['Factor limitante', 'texto', '-', 'Groundy', 'Lo que más limita al cultivo (temperatura o lluvia).', ''],
  confidence: ['Confianza', 'alta / media / baja', '-', 'Groundy', 'Qué tan confiable es el resultado según la calidad de los datos.', ''],
  sister_site: ['Sitio hermano', 'texto', '-', 'Groundy', 'Sitio de referencia más parecido al consultado.', ''],
  rotations: ['Rotaciones propuestas', 'texto / número', '-', 'Groundy', 'Secuencias de cultivos con su puntaje.', 'Escenarios para explorar; pesos pendientes de validación agronómica.'],
  best_rotation: ['Rotación de mayor puntaje', 'texto', '-', 'Groundy', 'La secuencia con el puntaje más alto.', 'No es una prescripción; depende de reglas pendientes de validación agronómica.'],
  t_opt: ['Temperatura óptima del cultivo (t_opt_min / t_opt_max)', '°C', '-', 'FAO EcoCrop', 'Rango de temperatura ideal.', 'Por especie.'],
  t_abs: ['Temperatura absoluta que tolera (t_abs_min / t_abs_max)', '°C', '-', 'FAO EcoCrop', 'Rango máximo que el cultivo aguanta.', 'Por especie.'],
  rain_opt: ['Lluvia óptima por ciclo (rain_opt_min / rain_opt_max)', 'mm', '-', 'FAO EcoCrop', 'Lluvia ideal durante todo el ciclo.', 'Por especie.'],
  t_kill: ['Temperatura de helada letal', '°C', '-', 'FAO EcoCrop', 'Temperatura que mata al cultivo.', 'No basta por sí sola para hablar de helada: el umbral real depende de la etapa y la variedad.'],
  ph_opt: ['pH óptimo del suelo', 'adimensional', '-', 'FAO EcoCrop', 'Rango de pH ideal (también hay uno absoluto: ph_abs).', ''],
  cycle_used_d: ['Duración del ciclo', 'días', '-', 'FAO EcoCrop', 'Días desde siembra hasta cosecha.', ''],
  family: ['Familia botánica / leguminosa / rol', 'texto', '-', 'FAO EcoCrop', 'Familia del cultivo, si es leguminosa y su rol (cereal, tubérculo...). Sirve para rotar.', ''],
};
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const entry = ([name, unit, resolution, source, meaning, caveat], key) => ({ variable: key, name, unit, resolution, source, meaning, caveat: caveat || null });
const label = k => (V[k] ? V[k][0] : k);
function lookup(q) {
  const t = norm(q).trim(); if (!t) return [];
  if (V[t]) return [entry(V[t], t)];
  return Object.keys(V).filter(k => norm(k).includes(t) || norm(V[k][0]).includes(t) || (t.length >= 4 && t.includes(norm(k)))).slice(0, 3).map(k => entry(V[k], k));
}
module.exports = { lookup, label, VARIABLES: Object.keys(V) };
