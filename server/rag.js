'use strict';
// RAG mínimo: lee knowledge/*.md (excepto README) y recupera fragmentos por palabras clave.
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'knowledge');
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
let chunks = null;
function load() { chunks = []; if (!fs.existsSync(DIR)) return;
  for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.md') && f.toLowerCase() !== 'readme.md'))
    fs.readFileSync(path.join(DIR, f), 'utf8').split(/\n\s*\n/).filter(p => p.trim().length > 40).forEach((p, i) => chunks.push({ source: f, id: f + '#' + i, text: p.trim() })); }
function retrieve(q, k = 3) { if (!chunks) load(); const w = norm(q).split(/[^a-z0-9]+/).filter(x => x.length > 3);
  return chunks.map(c => ({ c, s: w.filter(x => norm(c.text).includes(x)).length })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, k).map(x => x.c); }
module.exports = { retrieve, reload: () => { chunks = null; } };
