// Compatibilidad en navegadores y dispositivos (caso D) — Playwright.
//
//   npm ci && npx playwright install            (una vez)
//   $env:ERP_EMAIL="..."; $env:ERP_PASSWORD="..."; npx playwright test
//
// Corre contra el entorno PRENDIDO en AWS (las URLs de CloudFront no cambian al prender/apagar).
// Solo recorre y lee: no crea, edita ni borra datos, ni envía mensajes o correos.
import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const edgeInstalado = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].some((ruta) => existsSync(ruta));

export const ERP_URL = process.env.ERP_URL ?? "https://d31inue0zw9dve.cloudfront.net";
export const PORTAL_URL = process.env.PORTAL_URL ?? "https://d188pgulvqbzh4.cloudfront.net";
export const SESION_ERP = ".auth/erp.json";

const escritorio = [
  { name: "chrome", use: { ...devices["Desktop Chrome"] } },
  { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  { name: "safari-webkit", use: { ...devices["Desktop Safari"] } },
  // Edge usa el motor de Chrome (Chromium): se prueba con el Edge instalado si lo hay.
  ...(edgeInstalado ? [{ name: "edge", use: { ...devices["Desktop Edge"], channel: "msedge" } }] : []),
];
const movil = [
  { name: "movil-android", use: { ...devices["Pixel 7"] } },
  { name: "movil-iphone", use: { ...devices["iPhone 14"] } },
];

export default defineConfig({
  testDir: "./pruebas",
  timeout: 45_000,
  expect: { timeout: 15_000 },
  retries: 1, // un reintento por red; si falla dos veces es un fallo real
  workers: 3,
  reporter: [
    ["list"],
    ["html", { outputFolder: "../../evidencias/playwright-reporte", open: "never" }],
    ["junit", { outputFile: "../../evidencias/navegadores.xml" }],
  ],
  outputDir: "../../evidencias/playwright-resultados",
  use: {
    locale: "es-PE",
    timezoneId: "America/Lima",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    // Inicia sesión UNA vez y la comparte con todos los navegadores (no gasta intentos de login).
    { name: "sesion", testMatch: /sesion\.setup\.ts/, use: { ...devices["Desktop Chrome"] } },
    ...escritorio.map((p) => ({ ...p, dependencies: ["sesion"] })),
    // El ERP es una aplicación de escritorio: en móvil solo se prueba el portal y la convivencia.
    ...movil.map((p) => ({ ...p, dependencies: ["sesion"], testIgnore: /erp\.spec\.ts/ })),
  ],
});
