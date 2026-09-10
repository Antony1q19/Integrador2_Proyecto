# Experimento WPO — Semana 4

Plantilla de trabajo para el experimento controlado sobre el incremento Front-End
(Next.js 16) del recorrido de búsqueda de postulantes. Se completa con datos reales
del equipo; no se reportan números que no se hayan medido.

## Core Web Vitals de referencia

| Métrica | Bueno | Pobre |
|---|---|---|
| LCP | ≤ 2.5 s | > 4.0 s |
| INP | ≤ 200 ms | > 500 ms |
| CLS | ≤ 0.10 | > 0.25 |

## Estrategia priorizada por evidencia (Next.js 16)

| Hallazgo | Hipótesis | Cambio candidato | Verificación |
|---|---|---|---|
| El paquete inicial podría incluir componentes no necesarios en el primer render (`AsociarPostulantesPortal.tsx`, `PostulantesPipeline.tsx`). | Código opcional se carga antes de necesitarse. | `next/dynamic` (import dinámico) para esos componentes. | El build genera un chunk separado y el flujo sigue funcionando. |
| Imágenes (foto de perfil, logos de empresa) pueden afectar el LCP. | El recurso se descubre tarde o es más pesado de lo necesario. | `next/image` con dimensiones fijas y `priority` solo en el elemento LCP real. | LCP mejora sin distorsión; Lighthouse lo confirma. |
| Skeletons y tarjetas deben reservar el mismo espacio que el contenido final. | No se reserva espacio y el contenido desplaza al skeleton. | `width`/`height` o `aspect-ratio` fijos. | CLS local baja, sin salto visible. |
| Filtrado de listas grandes en el cliente puede bloquear el hilo principal. | Un cálculo largo en `usePostulantesList` retrasa la respuesta. | `useMemo` / `useDeferredValue`; paginación cuando exista Back-End. | Traza de Performance con menos bloqueo. |
| `PostulantesTable` puede crecer en filas simultáneas. | Muchos nodos DOM incrementan el trabajo de render. | Paginación o virtualización de la tabla. | Menos nodos DOM, sin perder semántica. |

## Línea base — pasos a ejecutar

```bash
cd frontend/ERP
npm ci
npm run build      # registrar First Load JS por ruta
npm run start       # o npm run dev; URL estable, ventana de incógnito
# Lighthouse, categoría Performance, mismo dispositivo emulado, 3 corridas → mediana
```

## Hipótesis candidata (a confirmar por el equipo)

> Si diferimos con `next/dynamic` el componente `AsociarPostulantesPortal` (solo
> necesario al asociar postulantes a un anuncio) fuera del primer render de
> `/anuncios`, entonces el First Load JS de esa ruta baja y el LCP no empeora,
> porque ese componente no es visible al cargar la página. Lo aceptamos si aparece
> un chunk separado, el build permanece dentro del presupuesto propuesto y el flujo
> de asociar postulantes sigue funcionando igual.

## Matriz antes / después (completar con mediciones reales)

| Métrica | Antes (línea base) | Después (con el cambio) | Decisión |
|---|---|---|---|
| First Load JS de la ruta afectada | _por medir_ | _por medir_ | _por decidir_ |
| LCP (p75, laboratorio) | _por medir_ | _por medir_ | _por decidir_ |
| CLS (p75, laboratorio) | _por medir_ | _por medir_ | _por decidir_ |
| `npm run build` / `npm run lint` | verde | verde | requisito, no opcional |

Decisión final (mejorar / mantener / revertir / investigar) se registra solo después
de ejecutar las tres corridas de antes y de después bajo las mismas condiciones.

Detalle completo, catálogo KPI/SLI y borrador de SLA: ver el documento «Laboratorio 4»
del equipo y `docs/metrics/catalogo-kpi-sli.md`.
