// Capacidad de interacción (usabilidad, ISO/IEC 25010) — Playwright + axe-core.
//
//   npm ci && npx playwright install chromium        (una vez)
//   $env:ETAPA="antes"; $env:ERP_PASSWORD="..."; npx playwright test
//
// Corre contra el entorno PRENDIDO en AWS. Solo navega, llena formularios SIN enviarlos y lee: no crea,
// edita ni borra datos. ETAPA (antes | despues) decide la carpeta de evidencias: tests/usabilidad/evidencias/<ETAPA>/
import { defineConfig, devices } from "@playwright/test";

export const ERP_URL = process.env.ERP_URL ?? "https://d31inue0zw9dve.cloudfront.net";
export const PORTAL_URL = process.env.PORTAL_URL ?? "https://d188pgulvqbzh4.cloudfront.net";
export const ETAPA = process.env.ETAPA ?? "despues";
export const EVIDENCIAS = `../evidencias/${ETAPA}`;
export const SESION_ADMIN = ".auth/admin.json";
export const SESION_RRHH = ".auth/rrhh.json";
// El flujo con datos de prueba guarda sus resultados aparte (no pisa los de la suite principal).
const SUFIJO = process.env.FLUJO_DATOS_PRUEBA ? "-flujo" : "";

export default defineConfig({
  testDir: "./pruebas",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 1, // un reintento por red; si falla dos veces es un hallazgo
  workers: 2,
  reporter: [
    ["list"],
    ["json", { outputFile: `${EVIDENCIAS}/resultados${SUFIJO}.json` }],
    ["html", { outputFolder: `${EVIDENCIAS}/reporte-html${SUFIJO}`, open: "never" }],
  ],
  outputDir: `${EVIDENCIAS}/.playwright`,
  use: { locale: "es-PE", timezoneId: "America/Lima", trace: "off", screenshot: "off", video: "off" },
  projects: [
    { name: "sesion", testMatch: /sesion\.setup\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "escritorio", testIgnore: /(movil|flujo-postulante)\.spec\.ts/, dependencies: ["sesion"], use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 800 } } },
    { name: "movil", testMatch: /movil\.spec\.ts/, use: { ...devices["Pixel 7"] } },
    // Flujo con datos de prueba: crea UN postulante de prueba, su postulación y una entrevista (que al final
    // se cancela). Sin reintentos, para no crear cuentas repetidas. Solo corre si se pide: --project=flujo
    { name: "flujo", testMatch: /flujo-postulante\.spec\.ts/, dependencies: ["sesion"], retries: 0, use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 800 } } },
  ],
});
