'use strict';
// Control de cupo de la IA para que MUCHOS usuarios a la vez no agoten la cuota gratuita:
//  - por proveedor: máximo de llamadas por minuto (RPM) y enfriamiento tras un 429/error
//  - concurrencia: cuántas llamadas a la IA a la vez, con una cola corta (si se llena, se responde en modo básico)
//  - por usuario: cupo por hora para que un solo usuario no consuma el cupo de todos (al pasarse NO se bloquea: pasa al modo básico)
const cooling = new Map(), calls = new Map(), users = new Map(), queue = [];
let active = 0;
const now = () => Date.now(), recent = (a, ms) => (a || []).filter(t => now() - t < ms);

const available = (idx, rpm) => (cooling.get(idx) || 0) <= now() && recent(calls.get(idx), 60000).length < rpm;
const note = idx => { const a = recent(calls.get(idx), 60000); a.push(now()); calls.set(idx, a); };
function penalize(idx, err) {
  const s = err && err.status; let ms = 30000; // timeouts y errores 5xx
  if (s === 429) ms = (err.retryAfter || 60) * 1000; else if (s === 401 || s === 403) ms = 600000; else if (s === 400) ms = 120000;
  cooling.set(idx, now() + Math.min(ms, 900000));
}
function allowUser(id) {
  const max = process.env.LLM_PER_USER_HOUR === undefined ? 15 : +process.env.LLM_PER_USER_HOUR; if (!max) return true;
  const a = recent(users.get(id), 3600000), ok = a.length < max; if (ok) a.push(now()); users.set(id, a);
  if (users.size > 5000) for (const [k, v] of users) if (!recent(v, 3600000).length) users.delete(k);
  return ok;
}
function release() { const w = queue.shift(); if (w) { clearTimeout(w.timer); w.resolve(release); } else active--; }
function acquire() {
  const max = +process.env.LLM_CONCURRENCY || 4, wait = +process.env.LLM_QUEUE_WAIT_MS || 6000;
  if (active < max) { active++; return Promise.resolve(release); }
  return new Promise(resolve => { const w = { resolve, timer: setTimeout(() => { queue.splice(queue.indexOf(w), 1); resolve(null); }, wait) }; queue.push(w); });
}
const status = () => ({ active, queued: queue.length, cooling: [...cooling].filter(([, t]) => t > now()).map(([i]) => i) });
const reset = () => { cooling.clear(); calls.clear(); users.clear(); queue.length = 0; active = 0; };
module.exports = { available, note, penalize, allowUser, acquire, status, reset };
