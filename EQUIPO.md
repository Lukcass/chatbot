# Papanauta · Lista de tareas del equipo (marca al terminar)

## A. Conectar la IA (quien tenga el backend) — 10 min
- [ ] Clave gratuita (p. ej. aistudio.google.com/apikey)
- [ ] `cp .env.example .env` y rellenar `LLM_PRESET=gemini`, `LLM_API_KEY=...`, `LLM_MODEL=<nombre exacto de la lista del proveedor>` (debe soportar herramientas)
- [ ] `npm run check-api` → debe decir **OK**. (401/403 clave · 404 modelo/URL · 429 límite)
- [ ] `npm start` y abrir `/api/papanauta/health` → `llm:true`
- [ ] Probar con el sitio demo: "¿qué rotación me conviene?" → debe llamar a `get_rotations` y decir que son datos de demostración
- [ ] Crear claves de 1–2 proveedores DISTINTOS de respaldo (`LLM_*_2`, `LLM_*_3`) y poner en `LLM_RPM*` el límite por minuto de cada plan
- [ ] `npm run load-sim 300 2` para ver cómo se reparte la carga; revisar `/health` (campo `load`) durante la demo
- [ ] Decidir: ¿plan de pago de bajo costo o Ollama propio si el cupo gratuito no alcanza?
- [ ] NO subir `.env` a Git (ya está en `.gitignore`)

## B. Integrar el widget (quien tenga el frontend)
- [ ] Copiar `web/papanauta-widget.js` y cargarlo una vez
- [ ] `Papanauta.mount({ apiUrl, language, currentSection })` al iniciar la app
- [ ] En cada cambio de pantalla: `setContext({ currentSection: 'inicio'|'mapa'|'cultivos'|'aprender' })`
- [ ] Al elegir sitio/parcela: `setContext({ siteId })` (o `plot:{lat,lon}`)
- [ ] Escuchar `papanauta:evidence` y abrir *Saber más*

## C. Datos de Groundy (quien tenga Groundy)
- [ ] Exportar un JSON por sitio a `data/sites/` con el esquema de `data/README.md` y borrar `demo.json`
- [ ] O conectar la API: `GROUNDY_API_URL` + `normalize()` en `server/data/groundy-api.js`
- [ ] Verificar que, con un sitio inexistente, Papanauta diga "todavía no tengo datos"
- [ ] Verificar que `demo:false` solo se use con datos reales

## D. Contenido y calidad
- [ ] Un agrónomo revisa los textos de `src/engine.js` y los avisos de `tools.js` (Kc, pesos y reglas de rotación = "pendiente de validación agronómica")
- [ ] Subir documentos validados a `knowledge/` (fuente en la 1.ª línea)
- [ ] Probar en móvil y escritorio las 4 pantallas
- [ ] Hosting con Node para el backend
