// 3 · ASISTENCIA AL USUARIO: el sistema ayuda a todos (incluidos lectores de pantalla y baja visión) a usarlo:
// etiquetas accesibles, idioma declarado, contraste legible y orientación ante errores. axe-core = WCAG 2.1 AA.
import { test, expect, auditarAccesibilidad, resaltar } from "./base";
import { ERP_URL, PORTAL_URL, SESION_ADMIN } from "../playwright.config";

test.describe("con rol Admin", () => {
  test.use({ storageState: SESION_ADMIN });

  test("CP-USAB-13 · cada campo del formulario tiene una etiqueta accesible", async ({ page }) => {
    await page.goto(`${ERP_URL}/postulantes/nuevo`);
    await expect(page.getByPlaceholder("Ej: Juan Carlos")).toBeVisible();
    const violaciones = await auditarAccesibilidad(page, "CP-USAB-13", ["label", "select-name", "aria-input-field-name"]);
    await resaltar(page, violaciones.flatMap((v) => v.nodes.map((n) => n.target.join(" "))));
    // Un lector de pantalla llega al campo por su etiqueta:
    await expect(page.getByLabel("Nombres")).toBeVisible();
    expect(violaciones.map((v) => `${v.id}: ${v.nodes.length} campos`)).toEqual([]);
  });

  test("CP-USAB-18 · el texto del ERP tiene contraste suficiente (WCAG 1.4.3, 4.5:1)", async ({ page }) => {
    await page.goto(`${ERP_URL}/postulantes/nuevo`);
    await expect(page.getByPlaceholder("Ej: Juan Carlos")).toBeVisible();
    const violaciones = await auditarAccesibilidad(page, "CP-USAB-18", ["color-contrast"]);
    await resaltar(page, violaciones.flatMap((v) => v.nodes.map((n) => n.target.join(" "))));
    expect(violaciones.flatMap((v) => v.nodes.map((n) => n.target.join(" ")))).toEqual([]);
  });
});

test("CP-USAB-18b · el texto del portal tiene contraste suficiente (WCAG 1.4.3, 4.5:1)", async ({ page }) => {
  await page.goto(`${PORTAL_URL}/registro`);
  await expect(page.locator("#nombres")).toBeVisible();
  const violaciones = await auditarAccesibilidad(page, "CP-USAB-18b", ["color-contrast"]);
  await resaltar(page, violaciones.flatMap((v) => v.nodes.map((n) => n.target.join(" "))));
  expect(violaciones.flatMap((v) => v.nodes.map((n) => n.target.join(" ")))).toEqual([]);
});

test("CP-USAB-16 · una dirección que no existe orienta al usuario en el portal", async ({ page }) => {
  const respuesta = await page.goto(`${PORTAL_URL}/vacante-que-no-existe-123`);
  expect(respuesta?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /no encontrada/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Explorar ofertas/i })).toBeVisible();
});

test("CP-USAB-17 · el ERP y el portal declaran su idioma (WCAG 3.1.1)", async ({ page }) => {
  await page.goto(`${PORTAL_URL}/login`);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.goto(`${ERP_URL}/login`);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  const violaciones = await auditarAccesibilidad(page, "CP-USAB-17", ["html-has-lang", "html-lang-valid"]);
  expect(violaciones).toEqual([]);
});

test("CP-USAB-AXE · auditoría WCAG 2.1 AA completa de la portada del portal y del login del ERP", async ({ page }) => {
  const resumen: string[] = [];
  for (const [id, url] of [["CP-USAB-AXE-portal", PORTAL_URL], ["CP-USAB-AXE-erp-login", `${ERP_URL}/login`]] as const) {
    await page.goto(url);
    await page.waitForLoadState("networkidle").catch(() => {});
    const v = await auditarAccesibilidad(page, id);
    resumen.push(...v.filter((x) => x.impact === "critical" || x.impact === "serious").map((x) => `${id} · ${x.id} (${x.impact}) · ${x.nodes.length}`));
  }
  test.info().annotations.push({ type: "axe", description: resumen.join(" | ") || "sin violaciones graves" });
  expect(resumen, "violaciones críticas o graves de WCAG 2.1 AA").toEqual([]);
});
