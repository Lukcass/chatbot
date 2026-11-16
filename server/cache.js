'use strict';
// Caché en memoria (LRU + vencimiento) de respuestas de la IA a preguntas autocontenidas (sin historial ni memoria).
// Muchos usuarios preguntan lo mismo ("¿por qué rotar la papa?"): se paga la IA una vez y se sirve a todos.
const store = new Map();
const ttl = () => (process.env.CACHE_TTL_MIN === undefined ? 60 : +process.env.CACHE_TTL_MIN) * 60000;
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
const key = (message, lang, ctx) => [norm(message), lang, ctx.currentSection, ctx.siteId || '', ctx.plot ? JSON.stringify(ctx.plot) : '', ctx.nasaData ? JSON.stringify(ctx.nasaData) : ''].join('|');
function get(k) { const e = store.get(k); if (!e) return null; if (e.exp < Date.now()) { store.delete(k); return null; } store.delete(k); store.set(k, e); return e.v; }
function set(k, v) { if (!ttl()) return; store.set(k, { v, exp: Date.now() + ttl() }); while (store.size > 500) store.delete(store.keys().next().value); }
module.exports = { key, get, set, clear: () => store.clear(), size: () => store.size };
