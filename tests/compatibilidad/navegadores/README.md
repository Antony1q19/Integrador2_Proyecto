# Compatibilidad en navegadores y dispositivos (caso D) — Playwright

Recorre el ERP y el portal de empleos **en el entorno real** (la app debe estar prendida) con
varios navegadores y dispositivos. Solo navega y lee: no crea, edita ni borra datos.

| Proyecto | Motor | Qué se prueba |
|---|---|---|
| `chrome` | Chromium | ERP + portal + convivencia |
| `firefox` | Gecko | ERP + portal + convivencia |
| `safari-webkit` | WebKit (motor de Safari) | ERP + portal + convivencia |
| `edge` | Edge instalado (solo si existe en la PC) | ERP + portal + convivencia |
| `movil-android` | Chromium, Pixel 7 | Portal + convivencia |
| `movil-iphone` | WebKit, iPhone 14 | Portal + convivencia |

**En cada prueba**, cualquier respuesta 5xx o error de JavaScript del navegador hace fallar la prueba.

| Archivo | Casos |
|---|---|
| `pruebas/erp.spec.ts` | Dashboard, postulantes (y abrir una ficha), pipeline, anuncios, empresas, plantillas y chats de WhatsApp, cerrar sesión, páginas protegidas |
| `pruebas/portal.spec.ts` | Portada con anuncios, buscador, detalle con botón para postular, login, páginas privadas, registro, recuperar contraseña, privacidad, sin scroll horizontal (diseño adaptable) |
| `pruebas/coexistencia.spec.ts` | E4: con sesión en el ERP, el portal sigue sin sesión; la cookie es httpOnly y de su propio dominio; las dos apps en pestañas del mismo navegador |

## Cómo ejecutar

```powershell
cd tests\compatibilidad\navegadores
npm ci
npx playwright install chromium firefox webkit   # una vez
$env:ERP_EMAIL="admin@test.com"; $env:ERP_PASSWORD="<clave>"
npx playwright test
npm run reporte                                  # abre el reporte HTML con capturas y videos de fallos
```

- Inicia sesión **una sola vez** y reutiliza la sesión en todos los navegadores. No prueba contraseñas
  incorrectas, para no activar el bloqueo de 5 intentos fallidos.
- Evidencia: `tests/evidencias/navegadores.xml` (JUnit), `tests/evidencias/playwright-reporte/` (HTML) y
  capturas/videos de los fallos en `tests/evidencias/playwright-resultados/`.
- Para otro entorno: `$env:ERP_URL` y `$env:PORTAL_URL`.

Pendiente: los flujos que **modifican datos** (registrar un postulante, mover una tarjeta del pipeline,
enviar un WhatsApp) requieren un entorno de pruebas separado o datos de prueba que se puedan borrar.
Dispositivos reales (no emulados): BrowserStack o LambdaTest.
