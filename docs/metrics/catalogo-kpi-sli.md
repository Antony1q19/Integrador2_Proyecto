# Catálogo KPI / SLI — ERP de Reclutamiento (Semana 4)

Indicadores centrados en el recorrido crítico priorizado en la semana 3: búsqueda y
selección de postulantes (HU-04), más un guardrail de entrega del paquete Front-End.
Todo objetivo se rotula como **propuesto** mientras el sistema funcione con datos
sintéticos y sin Back-End conectado (ver `docs/riesgos/registro.md`, R-10).

| ID | Indicador | Tipo | Fórmula / estadístico | Ventana | Objetivo propuesto | Estado |
|---|---|---|---|---|---|---|
| KPI-01 | Finalización del flujo de búsqueda | KPI | Búsquedas con selección de postulante / búsquedas iniciadas × 100 | 28 días | Línea base + mejora | Sin RUM |
| SLI-01 | Respuesta correcta de búsqueda | SLI | Búsquedas con resultado válido / búsquedas elegibles × 100 | 28 días | ≥ 99 % | Propuesto |
| SLI-02 | Latencia de filtrado | SLI | p95 ms entre acción de filtrar y render de resultados | 28 días | ≤ 800 ms (cliente, sin red real) | Propuesto |
| UX-01 | LCP | Web Vital | p75 por segmento | 28 días | ≤ 2.5 s | Diagnóstico de laboratorio |
| UX-02 | INP | Web Vital | p75 por segmento | 28 días | ≤ 200 ms | Diagnóstico de laboratorio |
| UX-03 | CLS | Web Vital | p75 por segmento | 28 días | ≤ 0.10 | Diagnóstico de laboratorio |
| DEL-01 | Tamaño de paquete inicial (First Load JS) | Guardrail | Bytes reportados por `next build` | Cada PR | Definir tras medir la línea base | Por verificar |

## Ficha — SLI-01 (respuesta correcta de búsqueda)

- **Población elegible:** intentos de búsqueda con especialidad/criterio y datos de entrada válidos, ejecutados desde `/postulantes`.
- **Evento bueno:** el filtrado devuelve exactamente los postulantes que cumplen el criterio, o una lista vacía cuando corresponde (no un error de ejecución).
- **Fuente:** instrumentación local de `usePostulantesList` (evento de resultado), pendiente de versión con RUM real.
- **Segmentos:** por filtro usado (nombre / DNI / especialidad) y por rol.
- **Exclusiones:** búsquedas con datos sintéticos de prueba etiquetados explícitamente.
- **Responsable:** Adam (dueño del módulo HU-04).

## Ficha — SLI-02 (latencia de filtrado)

- **Población elegible:** búsquedas ejecutadas sobre el conjunto de datos sintéticos cargado en el cliente.
- **Evento bueno:** duración entre el inicio del filtrado y el primer render de `PostulantesTable` con resultados.
- **Fórmula:** p95 (método de rango más cercano: ordenar y tomar `ceil(0.95 × n)`).
- **Fuente:** `performance.now()` alrededor de la llamada a `postulantesService`.
- **Exclusiones:** primeras cargas en frío del bundle (se documentan aparte).
- **Responsable:** responsable de medición del Sprint.

## SLO y presupuesto de error (SLI-01)

| SLO | Presupuesto | Sobre 1 000 búsquedas elegibles |
|---|---|---|
| 99.0 % | 1.0 % | 10 búsquedas no válidas admitidas |
| 99.5 % | 0.5 % | 5 búsquedas no válidas admitidas |
| 95.0 % | 5.0 % | 50 búsquedas no válidas admitidas (demasiado laxo, no se adopta) |

Política: al 50 % del presupuesto se revisa tendencia; al 80 % se prioriza corrección;
al 100 % se declara incumplimiento y se revisa si el objetivo estaba mal definido.

Detalle completo, borrador de SLA y riesgos conectados (R-09 a R-11): ver el documento
«Laboratorio 4» del equipo y `docs/riesgos/registro.md`.
