// 4 · COMPROMISO DEL USUARIO en el celular (Pixel 7 emulado): el postulante usa el portal con una mano.
// Objetivo táctil: 44 × 44 px (WCAG 2.5.5 y guías de Apple/Google). Mínimo absoluto WCAG 2.2 AA: 24 px (2.5.8).
import { test, expect, resaltar } from "./base";
import { PORTAL_URL } from "../playwright.config";

test("CP-USAB-22 · en el celular, el buscador y sus accesos rápidos se tocan con comodidad (≥ 44 px)", async ({ page }) => {
  await page.goto(PORTAL_URL);
  const buscador = page.getByPlaceholder("Puesto, empresa o palabra clave");
  await expect(buscador).toBeVisible();
  const medidas: Record<string, number> = {};
  medidas["buscador"] = Math.round((await buscador.boundingBox())!.height);
  for (const chip of ["Desarrollador", "Contador", "Ventas", "Remoto"]) {
    const boton = page.getByRole("button", { name: chip, exact: true });
    if (await boton.count()) medidas[chip] = Math.round((await boton.first().boundingBox())!.height);
  }
  test.info().annotations.push({ type: "medidas", description: JSON.stringify(medidas) });
  const chicos = Object.entries(medidas).filter(([, alto]) => alto < 44).map(([n, alto]) => `${n}: ${alto}px`);
  if (chicos.length) await resaltar(page, ['button[class*="rounded-full"]']);
  expect(Object.keys(medidas).length, "accesos rápidos de búsqueda").toBeGreaterThan(1);
  expect(chicos, "objetivos táctiles menores a 44 px").toEqual([]);
});

test("CP-USAB-22b · el portal se adapta al ancho del celular (sin scroll horizontal)", async ({ page }) => {
  await page.goto(PORTAL_URL);
  await expect(page.locator("h3").first()).toBeVisible();
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(desborde).toBeLessThanOrEqual(1);
});
