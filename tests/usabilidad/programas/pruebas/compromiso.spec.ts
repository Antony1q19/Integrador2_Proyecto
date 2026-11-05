// 4 · COMPROMISO DEL USUARIO (user engagement): la interfaz invita a usarla y da valor inmediato:
// indicadores claros, tablero visual, exportación de reportes y confianza (privacidad).
import { test, expect } from "./base";
import { ERP_URL, PORTAL_URL, SESION_ADMIN } from "../playwright.config";

test.describe("con rol Admin", () => {
  test.use({ storageState: SESION_ADMIN });

  test("CP-USAB-19 · el dashboard muestra los indicadores clave de un vistazo", async ({ page }) => {
    await page.goto(`${ERP_URL}/dashboard`);
    for (const indicador of ["Postulaciones", "En proceso", "Contratados", "Descartados"]) {
      await expect(page.getByText(indicador, { exact: true }).first()).toBeVisible();
    }
  });

  test("CP-USAB-20 · el pipeline muestra a los candidatos como tablero por etapas", async ({ page }) => {
    await page.goto(`${ERP_URL}/postulantes/pipeline`);
    await expect(page.getByText("Postulado", { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/Entrevista/).first()).toBeVisible();
  });

  test("CP-USAB-21 · el reporte del dashboard se exporta a CSV con un clic", async ({ page }) => {
    await page.goto(`${ERP_URL}/dashboard`);
    const boton = page.getByRole("button", { name: /Exportar CSV/ });
    await expect(boton).toBeEnabled();
    const [descarga] = await Promise.all([page.waitForEvent("download"), boton.click()]);
    expect(descarga.suggestedFilename()).toMatch(/\.csv$/);
  });
});

test("CP-USAB-23 · la política de privacidad está a mano y en español claro", async ({ page }) => {
  await page.goto(`${PORTAL_URL}/legal/privacidad`);
  await expect(page.locator("h1, h2").first()).toBeVisible();
  await expect(page.getByText(/29733/).first()).toBeVisible(); // Ley de Protección de Datos Personales
});
