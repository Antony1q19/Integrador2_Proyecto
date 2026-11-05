// Caso D — el portal de empleos funciona en escritorio y móvil (Android e iPhone). Solo lectura.
import { test, expect } from "./base";
import { PORTAL_URL } from "../playwright.config";

test("la portada lista los anuncios vigentes", async ({ page }) => {
  await page.goto(PORTAL_URL);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.locator("h3").first()).toBeVisible(); // título de cada anuncio (JobCard)
});

test("el buscador filtra sin romper la página", async ({ page }) => {
  await page.goto(PORTAL_URL);
  const buscador = page.getByPlaceholder("Puesto, empresa o palabra clave");
  await buscador.fill("zzzz-sin-resultados");
  await buscador.press("Enter");
  await expect(page.locator("h3")).toHaveCount(0, { timeout: 15_000 });
  await buscador.fill("");
  await buscador.press("Enter");
  await expect(page.locator("h3").first()).toBeVisible();
});

test("al elegir un anuncio se ve su detalle y el botón para postular", async ({ page, isMobile }) => {
  test.skip(isMobile, "en móvil la tarjeta lleva a otra pantalla; se cubre con el detalle de escritorio");
  await page.goto(PORTAL_URL);
  const primero = page.locator("h3").first();
  const titulo = (await primero.textContent())?.trim() ?? "";
  await primero.click();
  await expect(page.getByRole("heading", { level: 2, name: titulo })).toBeVisible();
  await expect(page.getByRole("button", { name: /postular/i }).first()).toBeVisible();
});

test("el inicio de sesión del portal se muestra completo", async ({ page }) => {
  await page.goto(`${PORTAL_URL}/login`);
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  await expect(page.locator("#email")).toBeEditable();
  await expect(page.locator("#password")).toHaveAttribute("type", "password");
});

test("las páginas privadas del postulante piden iniciar sesión", async ({ page }) => {
  await page.goto(`${PORTAL_URL}/perfil`);
  await expect(page).toHaveURL(/\/login\?siguiente=/);
});

for (const ruta of ["/registro", "/recuperar-password", "/legal/privacidad"]) {
  test(`la página ${ruta} carga`, async ({ page }) => {
    const respuesta = await page.goto(`${PORTAL_URL}${ruta}`);
    expect(respuesta?.status()).toBeLessThan(400);
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });
}

test("el portal se adapta al ancho de la pantalla (sin scroll horizontal)", async ({ page }) => {
  await page.goto(PORTAL_URL);
  await expect(page.locator("h3").first()).toBeVisible();
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(desborde).toBeLessThanOrEqual(1);
});
