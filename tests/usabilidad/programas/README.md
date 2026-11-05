# Usabilidad (capacidad de interacción, ISO/IEC 25010:2023) con programas

Mide las 4 subcaracterísticas sobre la app **prendida en AWS**: facilidad de aprendizaje, protección
contra errores del usuario, asistencia al usuario y compromiso del usuario (user engagement).
Solo navega, llena formularios **sin enviarlos** y lee: no crea, edita ni borra datos.

| Programa | Qué hace |
|---|---|
| **Playwright** (`pruebas/*.spec.ts`) | Recorre el ERP (roles Admin y RRHH) y el portal en Chrome de escritorio y Pixel 7; captura cada caso |
| **axe-core** (`@axe-core/playwright`) | Audita WCAG 2.1 AA: etiquetas, contraste, idioma |
| **Lighthouse** (`lighthouse.mjs`) | Puntajes de accesibilidad, buenas prácticas, rendimiento y SEO (móvil y escritorio) |

## Ejecutar

```powershell
cd tests\usabilidad\programas
npm ci
npx playwright install chromium            # una vez
$env:ERP_PASSWORD="<clave de los usuarios de prueba>"
$env:ETAPA="despues"                        # o "antes": carpeta de evidencias
npx playwright test
node lighthouse.mjs
cd ..\..\..
python tests\usabilidad\programas\capturar_terminal.py despues   # captura de la terminal
python tests\usabilidad\programas\capturar_codigo.py             # código antes/después (git)
python tests\usabilidad\programas\actualizar_excel.py            # resultados medidos en la matriz Excel
```

## Evidencias (`tests/usabilidad/evidencias/`)

| Carpeta | Contenido |
|---|---|
| `antes/` | Versión desplegada el 01-11: `CP-USAB-xx.png`, `*-axe.json`, `resultados.json`, `reporte-html/`, `lighthouse-*.html`, `terminal-playwright.png` |
| `despues/` | Lo mismo con el commit 8dabb68 y la corrección de los chips (05-11) |
| `codigo/` | `CP-USAB-xx-codigo-antes.png` / `-despues.png`, tomados de git |
| `hallazgo-CP-USAB-22/` | Los chips del 05-11 medían 36 px (mínimo 44): captura antes de corregirlos |

## Casos con postulante de prueba (crean datos)

`pruebas/flujo-postulante.spec.ts` automatiza CP-USAB-05, 10, 11, 12 y 15. Registra un postulante de
prueba («Prueba Usabilidad QA», correo del simulador de SES), sube un CV de 1 KB, se postula al anuncio
de la empresa de prueba y programa una entrevista que al final se **cancela**. No corre por defecto:

```powershell
$env:FLUJO_DATOS_PRUEBA="1"; npx playwright test --project=flujo                 # crea un postulante nuevo
$env:FLUJO_SELLO="1824251"; $env:FLUJO_DATOS_PRUEBA="1"; npx playwright test --project=flujo   # reutiliza el ya creado
```

Guarda `resultados-flujo.json` y `reporte-html-flujo/` aparte. **No uses `--reporter=list` ni `--list`
en estas corridas:** reemplazan los reporteros de la configuración y no se guarda (o se pisa) el JSON.

Datos de prueba que quedaron en AWS (05-11-2026): el postulante `success+usabilidad1824251@simulator.amazonses.com`,
su CV de prueba, 1 postulación a «Analista de Pruebas QA» y 4 entrevistas, todas canceladas. Se borran
con `infra/aws/finalizar.ps1` al cerrar el curso.

## Resultado (05-11-2026)

- Suite principal: **11 de 20** casos pasaban antes (01-11) y **20 de 20** pasan después.
- Con postulante de prueba: **5 de 5** pasan. CP-USAB-12 (postulación duplicada) fallaba: no había indicador
  «Ya postulado» (`evidencias/hallazgo-CP-USAB-12/`). Se corrigió en `JobDetailPanel.tsx`, se publicó y pasa.
- Quedan para revisión manual CP-USAB-14 (skeletons) y CP-USAB-24 (transiciones).
