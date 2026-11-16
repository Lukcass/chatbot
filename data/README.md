# Datos procesados para Papanauta

Aquí van los resultados **ya calculados** por Groundy, un archivo `.json` por sitio (o un arreglo de sitios) en `data/sites/`.
Papanauta los consulta mediante herramientas; la IA nunca calcula ni inventa cifras, solo explica lo que ahí encuentra.

`sites/demo.json` es un sitio **ficticio** (`"demo": true`) para probar el flujo. Papanauta lo etiqueta como demostración. Bórralo cuando haya datos reales.

## Esquema (nombres según el Diccionario de Variables de Groundy)
```jsonc
{
  "siteId": "ipiales-01",          // obligatorio, único
  "name": "Ipiales · lote 1",
  "demo": false,                   // true = datos de demostración (se avisa al usuario)
  "lat": 0.83, "lon": -77.64,      // opcional; permite encontrar el sitio por coordenadas (tolerancia ~0,05°)
  "level": "point",                // point | area
  "climate":       { "source": "NASA POWER", "period": "2001-2025", "resolution": "~50 km", "tmean_c": 0, "rain_mm_yr": 0, "et0_mm_yr": 0, "aridity": 0 },
  "vegetation":    { "source": "MODIS MOD13Q1", "resolution": "250 m", "ndvi_monthly": [ /* 12 */ ] },
  "soil_moisture": { "source": "SMAP L4", "resolution": "~9 km", "sm_root_monthly": [ /* 12 */ ] },
  "rain_imerg":    { "source": "GPM IMERG v07", "resolution": "~10 km", "rain_imerg_mm_yr": 0, "rain_range_mm": 0 },
  "terrain":       { "source": "SRTM", "resolution": "30 m", "elevacion_m": 0, "pendiente_grados": 0 },
  "crops":     [ { "crop": "papa", "suit": 0, "best_month_es": "...", "limiting": "lluvia|temperatura", "confidence": "alta|media|baja" } ],
  "rotations": [ { "sequence": ["papa", "haba"], "score": 0 } ],
  "best_rotation": ["papa", "haba"]
}
```
Todas las secciones son opcionales: lo que falte, Papanauta dirá que no está disponible. (Los ceros de arriba son solo marcadores de tipo.)

## Conectar Groundy en vez de archivos
Define `GROUNDY_API_URL` (y `GROUNDY_API_KEY` si aplica) en `.env` y adapta `normalize()` en `server/data/groundy-api.js` al contrato real. El resto no cambia.
