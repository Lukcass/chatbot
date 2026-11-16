'use strict';
// Elige de dónde salen los datos: API de Groundy (si GROUNDY_API_URL existe) o archivos JSON procesados.
const active = () => process.env.GROUNDY_API_URL ? require('./groundy-api') : require('./files');
module.exports = { getSite: a => active().getSite(a), listSites: () => active().listSites(), name: () => process.env.GROUNDY_API_URL ? 'groundy-api' : 'files' };
