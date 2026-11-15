# Papanauta · Lista de tareas del equipo (marca al terminar)

## A. Conectar la IA (quien tenga el backend) — 10 min
- [ ] Crear clave gratuita (p. ej. Google AI Studio: aistudio.google.com/apikey)
- [ ] `cp .env.example .env` y rellenar `LLM_PRESET=gemini`, `LLM_API_KEY=...`, `LLM_MODEL=<nombre exacto de la lista del proveedor>`
- [ ] `npm run check-api` → debe decir **OK**. (401/403 clave · 404 modelo/URL · 429 límite)
- [ ] `npm start` y abrir `/api/papanauta/health` → `llm:true`
- [ ] NO subir `.env` a Git (añadirlo a `.gitignore`)

## B. Integrar el widget (quien tenga el frontend)
- [ ] Copiar `web/papanauta-widget.js` y cargarlo una vez
- [ ] `Papanauta.mount({ apiUrl, language, currentSection })` al iniciar la app
- [ ] En cada cambio de pantalla: `setContext({ currentSection: 'inicio'|'mapa'|'cultivos'|'aprender' })`
- [ ] Escuchar `papanauta:evidence` y abrir *Saber más*

## C. Datos NASA (quien tenga Groundy)
- [ ] Enviar `setContext({ nasaData: { source, period, demo:false, variables:{ tmean_c, rain_mm_yr, et0_mm_yr, aridity } } })` con datos reales
- [ ] O ajustar `server/nasa.js` al contrato de la API y rellenar `NASA_*` en `.env`
- [ ] Verificar que sin datos Papanauta diga "todavía no tengo datos de NASA"

## D. Contenido y calidad
- [ ] Un agrónomo revisa los textos de `src/engine.js`
- [ ] Subir documentos validados a `knowledge/` (fuente en la 1.ª línea)
- [ ] Probar en móvil y en escritorio las 4 pantallas

## E. Después del evento
- [ ] Servicio de visión para fotos (`POST /api/papanauta/image`)
- [ ] Hosting con Node para el backend
