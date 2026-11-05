# Adecuación funcional (ISO/IEC 25010) por funcionalidad — de punta a punta en AWS

Prueba las **17 funcionalidades** de TalentERP (14 del ERP y 3 del portal) en el sistema real y mide, en
cada una, sus 3 subcaracterísticas:

| Subcaracterística | Pregunta | Ejemplos de verificación |
|---|---|---|
| **Completitud** | ¿Existe la función y cubre la tarea? | Se registra la empresa, se sube el CV, la contratación aparece en su módulo |
| **Corrección** | ¿El resultado es correcto? | 6 competencias en 4 = 80 APTO, controles a 30/60/90 días, RUC de 10 dígitos rechazado |
| **Idoneidad** | ¿Lleva al objetivo sin estados inconsistentes? | No contratar dos veces, el anuncio se cierra al cubrir su vacante, permisos por rol |

Complementa las 168 pruebas unitarias de `tests/funcional/` (pytest, sin AWS).

## Cómo ejecutar

```powershell
cd tests\funcionalidad\programas
npm ci
npx playwright install chromium            # una vez
$env:ERP_PASSWORD="<clave de los usuarios de prueba>"
$env:DATOS_PRUEBA="1"                       # CREA datos de prueba (ver abajo)
$env:ETAPA="despues"                        # o "antes": carpeta de evidencias
npx playwright test
cd ..\..\..
python tests\funcionalidad\programas\capturar_verificaciones.py   # tablas por funcionalidad + terminal
python tests\funcionalidad\programas\capturar_codigo.py           # código antes/después de los defectos
```

**Datos de prueba:** crea una empresa «PRUEBA FUNCIONAL …», un anuncio «QA Funcional …», un postulante
«Prueba Funcional …» con su CV, su postulación, 2 evaluaciones, 2 entrevistas, una contratación y su
seguimiento. También postula al anuncio el postulante de prueba del portal. **Al final** cancela la
contratación y borra el anuncio y la empresa. El ERP no permite borrar postulantes: esos quedan y se borran
con `infra/aws/finalizar.ps1`. No envía mensajes de WhatsApp (solo lee plantillas y chats).

## Evidencias (`evidencias/`)

| Carpeta | Contenido |
|---|---|
| `antes/` | Corrida sin la corrección de F09: `verificaciones.json` (esperado y obtenido de cada verificación), capturas `Fxx-*.png`, `reporte-html/`, `terminal-playwright.png` |
| `despues/` | La misma corrida con la versión publicada |
| `verificaciones/` | `Fxx.png`: tabla de cada funcionalidad con esperado · antes · después |
| `codigo/` | Código de `EntrevistaModal.tsx` antes (git) y después |
| `hallazgo-F09/` | Formulario antes («Puedes guardarla igual») y después (aviso en rojo) |

## Resultado (05-11-2026)

- **Antes: 83 de 84** verificaciones. Falla **F09-I2**: con una fecha pasada, el formulario de entrevistas
  decía «Puedes guardarla igual si estás registrando una entrevista anterior», pero el servidor responde 400
  («debe programarse en una fecha y hora futura»).
- **Corrección:** `frontend/ERP/features/entrevistas/components/EntrevistaModal.tsx` aplica la misma regla
  que el servidor (commit a34edc4): muestra el aviso en rojo y no envía.
- **Después: 84 de 84.** Las 168 pruebas unitarias también pasan.
- Presentación: `docs/calidad/TalentERP-pruebas-funcionalidad-ISO25010.pptx`.
