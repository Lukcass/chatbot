/* Papanauta widget: JS puro, sin dependencias. Uso: const p = Papanauta.mount({ apiUrl:'/api/papanauta', language:'es', currentSection:'inicio' }); p.setContext({ currentSection:'mapa' }); */
(function (g) {
  const T = {
    es: { sub: 'Tu guía de cultivo de papa', ph: 'Escribe tu pregunta…', send: 'Enviar', hello: '¡Hola! Soy Papanauta. Elige una pregunta o escribe la tuya.', err: 'No pude conectar con Papanauta. Revisa tu conexión e inténtalo de nuevo.', img: 'Enviar foto', imgOff: 'El análisis de fotos todavía no está disponible. Pronto podrás enviar hojas o tubérculos.', ev: 'Ver evidencia', typing: 'Papanauta está escribiendo', close: 'Cerrar', open: 'Abrir Papanauta', general: 'Orientación general', nasa: 'Con datos NASA' },
    en: { sub: 'Your potato-growing guide', ph: 'Type your question…', send: 'Send', hello: "Hi! I'm Papanauta. Pick a question or type your own.", err: "Couldn't reach Papanauta. Check your connection and try again.", img: 'Send photo', imgOff: 'Photo analysis is not available yet. Soon you will be able to send leaves or tubers.', ev: 'See evidence', typing: 'Papanauta is typing', close: 'Close', open: 'Open Papanauta', general: 'General guidance', nasa: 'With NASA data' }
  };
  const CSS = `.pn{--bg:#0e1a15;--panel:#13241c;--line:#24392e;--fg:#e8f1ea;--mut:#9db3a4;--ac:#7fd18b;font-family:'Inter',system-ui,sans-serif;color:var(--fg)}
.pn *{box-sizing:border-box}.pn-fab{position:fixed;right:16px;bottom:16px;width:56px;height:56px;border-radius:50%;border:2px solid var(--ac);background:var(--bg);font-size:28px;cursor:pointer;z-index:9998;box-shadow:0 6px 20px #0006}
.pn-sheet{position:fixed;right:16px;bottom:84px;width:380px;max-width:calc(100vw - 24px);height:min(560px,calc(100vh - 110px));display:none;flex-direction:column;background:var(--panel);border:1px solid var(--line);border-radius:18px;overflow:hidden;z-index:9999;box-shadow:0 12px 40px #0008}
.pn-sheet.open{display:flex}@media(max-width:520px){.pn-sheet{right:0;bottom:0;width:100vw;max-width:100vw;height:80vh;border-radius:18px 18px 0 0}}
.pn-h{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--bg);border-bottom:1px solid var(--line)}.pn-h b{font-family:'Space Grotesk',sans-serif}.pn-h small{display:block;color:var(--mut)}.pn-x{margin-left:auto;background:none;border:0;color:var(--mut);font-size:20px;cursor:pointer}
.pn-m{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px}.pn-b{max-width:88%;padding:10px 12px;border-radius:14px;line-height:1.45;font-size:14px;white-space:normal;overflow-wrap:anywhere}
.pn-b.bot{background:var(--bg);border:1px solid var(--line);align-self:flex-start}.pn-b.me{background:var(--ac);color:#0b1a12;align-self:flex-end}.pn-b.err{border-color:#e07a5f}
.pn-tag{display:inline-block;margin-top:8px;font-size:11px;color:var(--mut);border:1px solid var(--line);border-radius:99px;padding:2px 8px}.pn-ev{display:block;margin-top:8px;background:none;border:0;color:var(--ac);font-size:12px;cursor:pointer;padding:0;text-decoration:underline}
.pn-c{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 10px}.pn-c button{background:none;border:1px solid var(--ac);color:var(--ac);border-radius:99px;padding:6px 10px;font-size:12px;cursor:pointer}
.pn-f{display:flex;gap:6px;padding:10px;border-top:1px solid var(--line)}.pn-f input[type=text]{flex:1;min-width:0;background:var(--bg);border:1px solid var(--line);border-radius:10px;color:var(--fg);padding:10px;font-size:14px}
.pn-f button{background:var(--ac);border:0;border-radius:10px;padding:0 12px;cursor:pointer;font-weight:600;color:#0b1a12}.pn-f .pn-i{background:var(--bg);border:1px solid var(--line);color:var(--fg)}
.pn-dots span{display:inline-block;width:6px;height:6px;margin:0 2px;border-radius:50%;background:var(--mut);animation:pnb 1s infinite}.pn-dots span:nth-child(2){animation-delay:.15s}.pn-dots span:nth-child(3){animation-delay:.3s}
@keyframes pnb{50%{transform:translateY(-4px)}}@media(prefers-reduced-motion:reduce){.pn-dots span{animation:none}}`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  function mount(opt) {
    const o = Object.assign({ apiUrl: '/api/papanauta', language: 'es', currentSection: 'inicio', userId: null, plot: null, nasaData: null, container: document.body, avatar: '🥔' }, opt);
    const st = { ctx: { currentSection: o.currentSection, userId: o.userId, plot: o.plot, nasaData: o.nasaData }, lang: o.language, hist: [], mem: {}, vision: false, busy: false };
    const t = () => T[st.lang] || T.es;
    const root = document.createElement('div'); root.className = 'pn';
    root.innerHTML = `<style>${CSS}</style><button class="pn-fab" aria-label="${t().open}">${o.avatar}</button>
<section class="pn-sheet" role="dialog" aria-label="Papanauta"><div class="pn-h"><span style="font-size:26px">${o.avatar}</span><div><b>Papanauta</b><small class="pn-sub"></small></div><button class="pn-x" aria-label="${t().close}">✕</button></div>
<div class="pn-m" aria-live="polite"></div><div class="pn-c"></div><div class="pn-f"><button class="pn-i" type="button"></button><input type="text" maxlength="1000"><button class="pn-s" type="button"></button></div></section>`;
    o.container.appendChild(root);
    const $ = s => root.querySelector(s), sheet = $('.pn-sheet'), msgs = $('.pn-m'), chips = $('.pn-c'), inp = $('input'), sendBtn = $('.pn-s'), imgBtn = $('.pn-i');
    const label = () => { $('.pn-sub').textContent = t().sub; inp.placeholder = t().ph; sendBtn.textContent = t().send; imgBtn.textContent = '📷'; imgBtn.title = imgBtn.ariaLabel = t().img; };
    const bubble = (cls, html) => { const d = document.createElement('div'); d.className = 'pn-b ' + cls; d.innerHTML = html; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; };
    const api = (p, init) => fetch(o.apiUrl + p, init).then(r => r.json().then(j => ({ ok: r.ok, status: r.status, j })));
    async function loadChips() { try { const r = await api(`/suggestions?section=${st.ctx.currentSection}&lang=${st.lang}`); drawChips(r.j.suggestions || []); } catch { chips.innerHTML = ''; } }
    function drawChips(list) { chips.innerHTML = ''; list.forEach(q => { const b = document.createElement('button'); b.type = 'button'; b.textContent = q; b.onclick = () => send(q); chips.appendChild(b); }); }
    async function send(text) {
      text = (text || inp.value).trim(); if (!text || st.busy) return; inp.value = ''; st.busy = true;
      bubble('me', esc(text)); const ty = bubble('bot', `<span class="pn-dots" role="status" aria-label="${t().typing}"><span></span><span></span><span></span></span>`);
      try {
        const r = await api('/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: text, language: st.lang, history: st.hist.slice(-10), memory: st.mem, context: st.ctx }) });
        if (!r.ok) throw new Error(r.status); const j = r.j; ty.remove();
        const b = bubble('bot', md(j.reply) + (j.notice ? `<br><small>${esc(j.notice)}</small>` : '') + (j.basis !== 'none' ? `<span class="pn-tag">${j.basis === 'nasa' ? t().nasa : t().general}</span>` : ''));
        if (j.evidence && j.evidence.length) { const e = document.createElement('button'); e.className = 'pn-ev'; e.textContent = t().ev; e.onclick = () => g.dispatchEvent(new CustomEvent('papanauta:evidence', { detail: { evidence: j.evidence, section: st.ctx.currentSection } })); b.appendChild(e); }
        st.hist.push({ role: 'user', content: text }, { role: 'assistant', content: j.reply }); st.mem = j.memory || st.mem; drawChips(j.suggestions || []);
      } catch { ty.remove(); bubble('bot err', esc(t().err)); }
      st.busy = false;
    }
    $('.pn-fab').onclick = () => { sheet.classList.toggle('open'); if (sheet.classList.contains('open')) inp.focus(); };
    $('.pn-x').onclick = () => sheet.classList.remove('open');
    sendBtn.onclick = () => send(); inp.onkeydown = e => { if (e.key === 'Enter') send(); };
    imgBtn.onclick = () => { if (!st.vision) return bubble('bot', esc(t().imgOff)); /* TODO(equipo): subir foto a POST /image cuando exista el servicio de visión */ };
    label(); bubble('bot', esc(t().hello)); loadChips();
    api('/health').then(r => { st.vision = !!(r.j.capabilities && r.j.capabilities.vision); }).catch(() => {});
    return { open: () => sheet.classList.add('open'), close: () => sheet.classList.remove('open'),
      setContext(p) { p = p || {}; if (p.language && p.language !== st.lang) { st.lang = p.language; label(); } const { language, ...rest } = p; Object.assign(st.ctx, rest); loadChips(); }, destroy: () => root.remove() };
  }
  g.Papanauta = { mount };
})(window);
