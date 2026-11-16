'use strict';
// Verificador de cifras: toda cifra que la IA escriba debe existir en lo que le devolvieron las herramientas
// (o en lo que el usuario/pantalla ya dijo). Si no, se marca como no verificada. No sustituye la revisión humana.
const NUM = /\d+(?:[.,]\d+)?/g;
const parse = s => parseFloat(String(s).replace(',', '.'));
const decimals = s => (String(s).split(/[.,]/)[1] || '').length;
function numbersIn(text) { return (String(text).match(NUM) || []).map(parse).filter(Number.isFinite); }
function unverified(reply, sources) {
  const allowed = new Set(); sources.forEach(s => numbersIn(typeof s === 'string' ? s : JSON.stringify(s)).forEach(n => { allowed.add(n); allowed.add(n * 100); }));
  const bad = [];
  for (const raw of String(reply).match(NUM) || []) {
    const n = parse(raw); if (Number.isInteger(n) && n <= 12) continue; // meses, conteos pequeños
    const tol = Math.max(0.51 * Math.pow(10, -decimals(raw)), 1e-9);
    if (![...allowed].some(a => Math.abs(a - n) <= tol)) bad.push(raw);
  }
  return [...new Set(bad)];
}
module.exports = { unverified };
