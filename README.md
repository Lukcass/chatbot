# Módulo Papanauta (chatbot de Potatonauts)

Chat **solo de texto**. Módulo independiente: **backend Node (sin dependencias)** + **widget JS puro**. La web principal lo monta y le dice en qué sección está y qué sitio/parcela mira el usuario; Papanauta consulta los datos ya procesados y los explica.

```
src/engine.js              Motor por reglas (funciona SIN IA): intenciones, typos, memoria, chips por sección
server/index.js            API HTTP (límite por IP) · chat.js (orquesta) · llm.js (IA + herramientas) · guard.js (verifica cifras) · rag.js
server/data/               Capa de datos: tools.js (herramientas de la IA) · glossary.js (diccionario Groundy)
                           provider.js → files.js (JSON procesados) | groundy-api.js (API, pendiente de contrato)
data/sites/*.json          Resultados procesados por sitio (hay uno DEMO ficticio) · data/README.md = esquema
web/papanauta-widget.js    Interfaz reutilizable · demo.html (ejemplo de integración)
knowledge/                 Biblioteca agronómica para RAG (vacía)
```

## Probar localmente (Node 18+)
```
npm test        # 24 pruebas
npm run load-sim   # simula 300 usuarios a la vez con una IA falsa (no gasta cuota)
npm start       # http://localhost:8787  → botón "Seleccionar sitio demo" y pregunta "¿qué rotación me conviene?"
```
Sin clave de IA responde en **modo reglas**. Con clave, la IA llama a las herramientas de datos.

## Cómo accede a los datos (y por qué no inventa cifras)
```
Usuario → widget → /chat → IA ──pide datos──▶ herramientas ──▶ data/sites/*.json  (hoy)
                              ◀──resultados──                └▶ API de Groundy      (luego)
                   ◀── respuesta + evidencia + verificación de cifras ──
```
La IA **no calcula**: solo redacta lo que devuelven estas herramientas (`server/data/tools.js`):
`list_sites` · `get_site_analysis` · `get_crop_suitability` · `get_rotations` · `explain_variable` (diccionario oficial de Groundy, funciona sin datos).
Cada resultado trae fuente, resolución y avisos (datos demo, "pendiente de validación agronómica", escala de celda). Después, `guard.js` revisa que **toda cifra de la respuesta exista en los resultados**; si no, la respuesta sale con `verified:false` y un aviso.
Para añadir una herramienta (p. ej. comparar sitios), agrégala a `definitions` y a `run` en `tools.js`.

## IA gratuita: qué usar
Necesitas un modelo con **llamado de herramientas (function calling)** y API compatible con OpenAI; ya hay presets en `.env`. Opciones sin costo (los límites cambian seguido: **confírmalos en la consola de cada proveedor**):

| Opción | Preset | Notas |
| :-- | :-- | :-- |
| **Google AI Studio (Gemini Flash / Flash-Lite)** — recomendada | `gemini` | Sin tarjeta; es el plan gratis más generoso, pero reportes de 2026 lo ubican en pocas peticiones por minuto (~10–15) y topes diarios; los modelos Pro ya no son gratis. Su plan gratuito no permite atender usuarios finales en el EEE/Suiza/Reino Unido. |
| Groq | `groq` | Gratis con límites; muy rápido. |
| Mistral (plan Experiment) | `mistral` | Gratis con herramientas, pero ~2 peticiones/min. |
| OpenRouter (modelos `:free`) | `openrouter` | Cupo diario bajo; los modelos gratis rotan. |
| **Ollama** (local o propio servidor) | `LLM_BASE_URL=http://localhost:11434/v1` | Gratis sin límites de cuota; necesita una máquina y un modelo con soporte de herramientas. |

Como el cupo gratuito es pequeño, mira la sección siguiente. `LLM_MODEL` debe ser el nombre exacto de la lista del proveedor. Pasos: `cp .env.example .env` → rellena `LLM_PRESET`, `LLM_API_KEY`, `LLM_MODEL` → `npm run check-api` → `npm start` → `/api/papanauta/health` debe mostrar `llm:true`.

## Muchos usuarios a la vez (cupo gratuito limitado)
Nadie queda bloqueado: cuando no hay cupo de IA, Papanauta responde en **modo básico** con un aviso. Cada consulta pasa por estas capas, de la más barata a la más cara (`server/chat.js`):

1. **Preguntas sugeridas (botones)** → las responde el motor de reglas, sin IA. Son la mayor parte del tráfico (`LLM_ON_CHIPS=1` para usar IA también ahí).
2. **Caché** (`CACHE_TTL_MIN`): una pregunta autocontenida ya respondida se sirve a todos. Solo se cachean respuestas verificadas y sin historial.
3. **Preguntas idénticas simultáneas** comparten **una sola** llamada a la IA.
4. **Cupo por usuario** (`LLM_PER_USER_HOUR`, por `userId` anónimo del widget o por IP): quien se pasa sigue en modo básico y no le quita cupo a los demás.
5. **Concurrencia y cola corta** (`LLM_CONCURRENCY`, `LLM_QUEUE_WAIT_MS`): el exceso pasa a modo básico en vez de esperar.
6. **Varios proveedores en cascada** (`LLM_*`, `LLM_*_2`… hasta `_4`) con tope por minuto (`LLM_RPM`) y enfriamiento tras un 429: se suma el cupo de proveedores distintos y no se insiste donde ya se agotó. Usa **un proveedor distinto por clave**; abrir varias cuentas del mismo proveedor puede violar sus términos.

`/api/papanauta/health` muestra proveedores activos, llamadas en curso, cola y proveedores enfriados.
**Simulación** (`npm run load-sim 300 N`, IA falsa de 10 llamadas/min por proveedor, 300 usuarios en el mismo instante: 60 % preguntas sugeridas, 40 % libres): con 1 proveedor ~58 % se resuelve sin IA y ~8 % con caché; con 4 proveedores la IA atiende ~13 % y el modo básico baja de ~31 % a ~10 %. Es un pico extremo y artificial; en uso real las consultas se reparten en el tiempo. Los números reales dependerán de tus límites y de qué pregunten.
**Para crecer más allá del plan gratuito** (decisión del equipo): un plan de pago de bajo costo en el proveedor principal (los límites suben mucho y los demás quedan de respaldo), o un modelo propio con **Ollama** en un servidor. Detrás de un proxy define `TRUST_PROXY=1`; si muchos usuarios comparten IP (colegio, evento) sube `RATE_LIMIT_PER_MIN`. Una consulta que usa datos gasta 2 llamadas (pedir datos + redactar).

## Estado: qué funciona y qué falta
| Funciona hoy | Preparado, PENDIENTE de conectar |
| :-- | :-- |
| Interfaz de chat (escritorio/móvil), bienvenida, indicador de escritura, errores | **IA**: código y pruebas con respuestas simuladas; **no probada con un proveedor real** (falta clave y modelo) |
| Motor por reglas sin credenciales, tolera typos, recuerda suelo/área/altitud | **Datos reales de Groundy**: hoy lee JSON; `groundy-api.js` espera el contrato real |
| Chips distintos por sección (inicio, mapa, cultivos, aprender) en ES/EN | **RAG**: código listo; `knowledge/` vacía |
| Herramientas de datos + glosario Groundy + evidencia + verificación de cifras (con el sitio **demo ficticio**) | Conectar el evento `papanauta:evidence` a *Saber más* |
| Control de carga: chips sin IA, caché, cupo por usuario, cola, respaldo entre proveedores (probado con simulación) | Medir con tráfico real y ajustar `LLM_RPM` a los límites de tu plan |
| No inventa datos; etiqueta los de demostración; no pronostica ni diagnostica | |

Limitaciones: el modo reglas responde en español (con IA, en el idioma pedido). Los textos del modo reglas **no están validados por fuentes**: que los revise un agrónomo. El verificador de cifras detecta números inventados, no afirmaciones falsas sin números.

## Integración
1. **Copiar** esta carpeta al repo del equipo. 2. **Backend:** `npm start` (o monta `handleChat(body)` de `server/chat.js`; devuelve `{status, json}`). Define `ALLOWED_ORIGIN` si la web está en otro dominio. 3. **Frontend:**
```html
<script src="/papanauta-widget.js"></script>
<script>
  const papanauta = Papanauta.mount({ apiUrl: 'https://TU-API/api/papanauta', language: 'es', currentSection: 'inicio' });
  papanauta.setContext({ currentSection: 'mapa' });   // inicio | mapa | cultivos | aprender (el historial se conserva)
  papanauta.setContext({ siteId: 'ipiales-01' });     // el servidor busca los datos procesados de ese sitio
  // o, si el sitio se identifica por coordenadas:     papanauta.setContext({ plot: { lat, lon } })
  window.addEventListener('papanauta:evidence', e => abrirSaberMas(e.detail));
</script>
```
En React/Vue: `mount` en `useEffect`/`onMounted` y `destroy()` al desmontar.
4. **Datos:** exporta de Groundy un JSON por sitio a `data/sites/` (esquema en `data/README.md`; borra `demo.json`), o define `GROUNDY_API_URL` y ajusta `normalize()`. Alternativa: la web envía `nasaData` ya listo en `setContext`.
5. **RAG:** convierte PDFs a texto, guarda `.md` en `knowledge/` con la fuente en la primera línea.

## Contrato de la API
`POST /api/papanauta/chat` → entrada `{ message, language, history:[{role,content}], memory, context:{ currentSection, userId, siteId, plot, nasaData } }`
→ salida `{ reply, basis:'nasa'|'data'|'general'|'none', evidence:[{factId,label,value,source}], suggestions, memory, mode:'rules'|'llm', verified, notice, nasaStatus, toolsUsed, routed:'chip'?, cached:true?, degraded:'busy'|'user_quota'|'llm_error'? }`
`GET /api/papanauta/suggestions?section=&lang=` · `GET /api/papanauta/health` → `{ capabilities:{ llm, data:'files'|'groundy-api' } }`.
Errores: `400` mensaje vacío/JSON inválido · `413` cuerpo grande · `429` demasiadas peticiones. El servidor no guarda estado: el cliente reenvía `memory`.
