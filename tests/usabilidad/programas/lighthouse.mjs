// Lighthouse (Google): puntajes de Accesibilidad, Buenas prácticas, Rendimiento y SEO de las páginas públicas.
//   $env:ETAPA="antes"; node lighthouse.mjs
// Usa el Chromium que instaló Playwright. Reportes: tests/usabilidad/evidencias/<ETAPA>/lighthouse-*.html y lighthouse.json
import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import { mkdirSync, writeFileSync } from "node:fs";

const ETAPA = process.env.ETAPA ?? "despues";
const ERP_URL = process.env.ERP_URL ?? "https://d31inue0zw9dve.cloudfront.net";
const PORTAL_URL = process.env.PORTAL_URL ?? "https://d188pgulvqbzh4.cloudfront.net";
const SALIDA = `../evidencias/${ETAPA}`;
mkdirSync(SALIDA, { recursive: true });

const paginas = [
  ["portal-portada", PORTAL_URL],
  ["portal-registro", `${PORTAL_URL}/registro`],
  ["erp-login", `${ERP_URL}/login`],
];
const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ["--headless=new", "--no-sandbox"] });
const resumen = {};
try {
  for (const [nombre, url] of paginas) {
    for (const [modo, opciones] of [["movil", {}], ["escritorio", { formFactor: "desktop", screenEmulation: { mobile: false, width: 1366, height: 800, deviceScaleFactor: 1, disabled: false }, throttlingMethod: "provided" }]]) {
      const r = await lighthouse(url, {
        port: chrome.port, output: "html", logLevel: "error", locale: "es",
        onlyCategories: ["accessibility", "best-practices", "performance", "seo"], ...opciones,
      });
      const c = r.lhr.categories;
      resumen[`${nombre} (${modo})`] = {
        url, accesibilidad: Math.round(c.accessibility.score * 100), buenas_practicas: Math.round(c["best-practices"].score * 100),
        rendimiento: Math.round(c.performance.score * 100), seo: Math.round(c.seo.score * 100),
        fallas_accesibilidad: Object.values(r.lhr.audits).filter((a) => a.score === 0 && r.lhr.categories.accessibility.auditRefs.some((x) => x.id === a.id)).map((a) => a.id),
      };
      writeFileSync(`${SALIDA}/lighthouse-${nombre}-${modo}.html`, r.report);
      console.log(nombre, modo, JSON.stringify(resumen[`${nombre} (${modo})`]));
    }
  }
} finally {
  await chrome.kill();
}
writeFileSync(`${SALIDA}/lighthouse.json`, JSON.stringify({ fecha: new Date().toISOString(), etapa: ETAPA, resumen }, null, 2));
