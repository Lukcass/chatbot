# Módulo Papanauta (chatbot de Potatonauts)

Módulo independiente: **backend Node (sin dependencias)** + **widget JS puro**. La web principal solo lo monta y le pasa el contexto.

```
papanauta/
├─ src/engine.js          Motor por reglas (funciona SIN IA): intenciones, errores ortográficos, memoria, chips por sección
├─ server/                index.js (API) · chat.js · llm.js (IA) · nasa.js (adaptador) · rag.js (documentos)
├─ web/papanauta-widget.js  Interfaz reutilizable · demo.html (ejemplo de integración)
├─ knowledge/             Biblioteca agronómica (VACÍA)
├─ test/basic.test.js     8 pruebas · .env.example  Variables sin credenciales
```

## Probar localmente (requiere Node 18+)
```
cd papanauta
npm test            # 8 pruebas
npm start           # http://localhost:8787  (demo con las 4 secciones)
```

## Estado: qué funciona y qué falta
| Funciona hoy | Preparado, PENDIENTE de conectar |
| :-- | :-- |
| Interfaz (escritorio/móvil), bienvenida, escritura, errores | **IA generativa** (`llm.js` hecho; falta proveedor, clave y modelo; no probado con credenciales reales) |
| Motor por reglas sin credenciales, tolera typos, recuerda suelo/área/altitud | **Datos NASA** (`nasa.js`: falta URL/contrato de la API de Groundy) |
| Chips distintos por sección (inicio, mapa, cultivos, aprender) en ES/EN | **RAG** (código listo; `knowledge/` vacía) |
| No inventa datos NASA; etiqueta los de demostración; no pronostica ni diagnostica | **Análisis de imágenes** (botón y `/image` devuelven "no disponible") |
| Botón "Ver evidencia" (emite evento `papanauta:evidence`) | Conectar ese evento a tu componente *Saber más* |

Limitaciones: el modo reglas responde en español (el inglés solo cambia chips y textos de interfaz; con IA responde en inglés). Los textos del modo reglas son orientación general y **no están validados por fuentes**: revísenlos con un agrónomo.

## Pasos de integración
1. **Copiar** la carpeta `papanauta/` al repo del equipo.
2. **Backend:** `npm start` en esa carpeta (o monta `server/chat.js` en tu servidor: `handleChat(body)` devuelve `{status, json}`). Define `ALLOWED_ORIGIN` si la web está en otro dominio.
3. **Frontend:** copia `web/papanauta-widget.js` y en tu página:
```html
<script src="/papanauta-widget.js"></script>
<script>
  const papanauta = Papanauta.mount({ apiUrl: 'https://TU-API/api/papanauta', language: 'es', currentSection: 'inicio' });
  // al cambiar de pantalla (el historial se conserva):
  papanauta.setContext({ currentSection: 'mapa' });           // inicio | mapa | cultivos | aprender
  // cuando existan: papanauta.setContext({ plot: {lat, lon, ...}, nasaData: {...} });
  window.addEventListener('papanauta:evidence', e => abrirSaberMas(e.detail));
</script>
```
En React/Vue: llama `mount` en `useEffect`/`onMounted` y `destroy()` al desmontar.
4. **Datos NASA:** la web principal envía `nasaData` con esta forma (si no hay, déjalo en `null`):
`{ source:'NASA POWER', period:'2001-2025', demo:false, variables:{ tmean_c, rain_mm_yr, et0_mm_yr, aridity } }`
(nombres del Diccionario de Variables). Alternativa: rellena `NASA_*` en `.env` y adapta `server/nasa.js` al contrato real.
5. **IA:** copia `.env.example` a `.env`, define `LLM_PRESET` (gemini, groq, mistral, cerebras, openrouter o anthropic), `LLM_API_KEY` y `LLM_MODEL`; ejecuta `npm run check-api` y luego `npm start`. Ver `EQUIPO.md` para la lista completa de tareas.
6. **RAG:** convierte PDFs a texto (p. ej. `pdftotext`), guarda `.md` en `knowledge/` con la fuente en la primera línea. Para mucho volumen, sustituye `rag.js` por una base vectorial.
7. **Imágenes:** elige un servicio de visión, impleméntalo en `POST /api/papanauta/image` (hoy devuelve 501) y haz `capabilities.vision = true` en `/health`; completa el `TODO` en el widget. Los resultados deben mostrarse como **orientativos**.

## Contrato de la API
`POST /api/papanauta/chat` → entrada `{ message, language, history:[{role,content}], memory, context:{ currentSection, userId, plot, nasaData } }`
→ salida `{ reply, basis:'nasa'|'general'|'none', evidence:[{factId,label,value,source}], suggestions:[...], memory, mode:'rules'|'llm', notice, nasaStatus }`
`GET /api/papanauta/suggestions?section=&lang=` · `GET /api/papanauta/health` · `POST /api/papanauta/image` (501).
Guarda `memory` en el cliente y reenvíala: el servidor no guarda estado.
