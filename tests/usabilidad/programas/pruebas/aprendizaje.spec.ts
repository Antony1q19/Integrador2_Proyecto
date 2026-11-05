// 1 · FACILIDAD DE APRENDIZAJE (ISO/IEC 25010:2023, capacidad de interacción): el usuario nuevo entiende
// qué hacer, dónde está y por qué el sistema reacciona como reacciona.
import { test, expect } from "./base";
import { ERP_URL, PORTAL_URL, SESION_ADMIN, SESION_RRHH } from "../playwright.config";

test.describe("con rol RRHH", () => {
  test.use({ storageState: SESION_RRHH });

  test("CP-USAB-01 · al entrar a una sección sin permiso, el sistema explica por qué", async ({ page }) => {
    await page.goto(`${ERP_URL}/dashboard`);
    await expect(page).toHaveURL(/\/postulantes/); // RRHH no ve el Dashboard: se le redirige
    await expect(page.getByText("Acceso restringido", { exact: false })).toBeVisible();
  });
});

test.describe("con rol Admin", () => {
  test.use({ storageState: SESION_ADMIN });

  test("CP-USAB-02 · el formulario por pasos muestra en qué paso va y cuánto falta", async ({ page }) => {
    await page.goto(`${ERP_URL}/postulantes/nuevo`);
    await expect(page.getByText(/Paso 1 de \d+ \(\d+% completado\)/)).toBeVisible();
  });

  test("CP-USAB-03 · una lista vacía orienta y ofrece crear el primer registro", async ({ page }) => {
    await page.goto(`${ERP_URL}/anuncios`);
    await page.getByPlaceholder("Buscar por cargo o empresa...").fill("zzzz-sin-resultados");
    await expect(page.getByText(/No se encontraron anuncios/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Crear Primer Anuncio/i })).toBeVisible();
  });

  test("CP-USAB-06 · la ayuda está organizada por módulos y su buscador filtra", async ({ page }) => {
    await page.goto(`${ERP_URL}/ayuda`);
    await expect(page.getByRole("heading", { name: "Ayuda" })).toBeVisible();
    await page.getByPlaceholder(/Buscar: entrevista/).fill("WhatsApp");
    await expect(page.getByText(/WhatsApp/).first()).toBeVisible();
  });
});

test("CP-USAB-04 · el buscador del portal se entiende a la primera y muestra resultados", async ({ page }) => {
  await page.goto(PORTAL_URL);
  const buscador = page.getByPlaceholder("Puesto, empresa o palabra clave");
  await expect(buscador).toBeVisible();
  await expect(page.locator("h3").first()).toBeVisible(); // hay ofertas listadas
  await buscador.fill("zzzz-sin-resultados");
  await buscador.press("Enter");
  await expect(page.locator("h3")).toHaveCount(0);
  await buscador.fill("");
  await buscador.press("Enter");
  await expect(page.locator("h3").first()).toBeVisible();
});
