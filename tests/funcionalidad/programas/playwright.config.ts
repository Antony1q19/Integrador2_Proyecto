// Adecuación funcional (ISO/IEC 25010) — cada funcionalidad del ERP y del portal, de punta a punta en AWS.
//
//   npm ci && npx playwright install chromium            (una vez)
//   $env:ERP_PASSWORD="..."; $env:DATOS_PRUEBA="1"; npx playwright test
//
// CREA DATOS DE PRUEBA (autorizado por el equipo el 05-11-2026): una empresa, un anuncio, un postulante con su
// CV, su postulación, 2 evaluaciones, 2 entrevistas, una contratación y su seguimiento. Al final cancela la
// contratación y borra el anuncio y la empresa. No envía WhatsApp. Resultados: tests/funcionalidad/evidencias/
import { defineConfig, devices } from "@playwright/test";

export const ERP_URL = process.env.ERP_URL ?? "https://d31inue0zw9dve.cloudfront.net";
export const PORTAL_URL = process.env.PORTAL_URL ?? "https://d188pgulvqbzh4.cloudfront.net";
// ETAPA = antes | despues (carpeta de evidencias)
export const EVIDENCIAS = `../evidencias/${process.env.ETAPA ?? "despues"}`;

export default defineConfig({
  testDir: "./pruebas",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  retries: 0, // crea datos: sin reintentos
  workers: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: `${EVIDENCIAS}/resultados-playwright.json` }],
    ["html", { outputFolder: `${EVIDENCIAS}/reporte-html`, open: "never" }],
  ],
  outputDir: `${EVIDENCIAS}/.playwright`,
  use: { actionTimeout: 15_000, navigationTimeout: 30_000, ...devices["Desktop Chrome"], viewport: { width: 1366, height: 800 }, locale: "es-PE", timezoneId: "America/Lima" },
});
