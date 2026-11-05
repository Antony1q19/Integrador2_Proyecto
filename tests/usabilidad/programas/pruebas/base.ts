// Fixture común: al terminar CADA prueba (pase o falle) se guarda la captura de pantalla como evidencia,
// con el ID del caso: tests/usabilidad/evidencias/<ETAPA>/<ID>.png.  Los hallazgos de axe se adjuntan en JSON.
import { test as base, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { EVIDENCIAS } from "../playwright.config";

export const test = base.extend<{ evidencia: void }>({
  evidencia: [
    async ({ page }, use, info) => {
      await use();
      const id = info.title.split(" ")[0]; // "CP-USAB-07 · ..." → "CP-USAB-07"
      mkdirSync(EVIDENCIAS, { recursive: true });
      if (!page.isClosed()) {
        await page.waitForTimeout(1200).catch(() => {}); // que terminen las animaciones de entrada (fade-in)
        await page.screenshot({ path: `${EVIDENCIAS}/${id}.png`, fullPage: false }).catch(() => {});
      }
    },
    { auto: true },
  ],
});

export { expect };

/** Ejecuta axe-core (WCAG 2.1 A y AA) y guarda los hallazgos. Devuelve las violaciones de las reglas pedidas. */
export async function auditarAccesibilidad(page: Page, id: string, reglas?: string[]) {
  let constructor = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
  if (reglas) constructor = constructor.withRules(reglas);
  const resultado = await constructor.analyze();
  mkdirSync(EVIDENCIAS, { recursive: true });
  const resumen = resultado.violations.map((v) => ({
    regla: v.id, impacto: v.impact, descripcion: v.help, elementos: v.nodes.length,
    ejemplos: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
  }));
  writeFileSync(`${EVIDENCIAS}/${id}-axe.json`, JSON.stringify({ url: page.url(), violaciones: resumen }, null, 2));
  return resultado.violations;
}

/** Marca en rojo los elementos señalados (para que la captura muestre el problema). */
export async function resaltar(page: Page, selectores: string[]) {
  await page.evaluate((sels) => {
    for (const s of sels) {
      for (const el of Array.from(document.querySelectorAll(s)).slice(0, 12)) {
        (el as HTMLElement).style.outline = "3px solid #e11d48";
        (el as HTMLElement).style.outlineOffset = "2px";
      }
    }
  }, selectores).catch(() => {});
}
