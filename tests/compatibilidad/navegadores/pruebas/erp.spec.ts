// Caso D — el ERP funciona igual en Chrome, Edge, Firefox y Safari (WebKit). Solo lectura.
import { test, expect } from "./base";
import { ERP_URL, SESION_ERP } from "../playwright.config";

test.describe("ERP con sesión iniciada", () => {
  test.use({ storageState: SESION_ERP });

  test("el dashboard muestra los indicadores", async ({ page }) => {
    await page.goto(`${ERP_URL}/dashboard`);
    await expect(page.getByRole("heading", { name: "Dashboard Principal" })).toBeVisible();
    await expect(page.getByText("Postulaciones", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Contratados", { exact: true }).first()).toBeVisible();
  });

  test("el listado de postulantes carga y abre la ficha", async ({ page }) => {
    await page.goto(`${ERP_URL}/postulantes`);
    await expect(page.getByRole("heading", { name: "Postulantes" })).toBeVisible();
    const filas = page.locator("tbody tr");
    await expect(filas.first()).toBeVisible();
    await expect(page.getByText("Error al cargar los datos")).toHaveCount(0);

    await filas.first().locator('a[href^="/postulantes/"]').first().click();
    await expect(page).toHaveURL(/\/postulantes\/[^/]+$/);
    await expect(page.getByText("Postulante no encontrado")).toHaveCount(0);
  });

  test("el pipeline de selección carga", async ({ page }) => {
    await page.goto(`${ERP_URL}/postulantes/pipeline`);
    await expect(page).toHaveTitle(/Pipeline de selección/);
    await expect(page.getByText("Error al cargar los datos")).toHaveCount(0);
  });

  for (const [ruta, titulo] of [
    ["/anuncios", "Anuncios"],
    ["/empresas", "Empresas"],
    ["/comunicaciones/plantillas", "Plantillas de WhatsApp"],
  ] as const) {
    test(`la página ${ruta} carga`, async ({ page }) => {
      await page.goto(`${ERP_URL}${ruta}`);
      await expect(page.getByRole("heading", { name: titulo }).first()).toBeVisible();
    });
  }

  test("los chats de WhatsApp cargan", async ({ page }) => {
    const respuesta = page.waitForResponse((r) => r.url().includes("/api/comunicaciones") && r.request().method() === "GET");
    await page.goto(`${ERP_URL}/comunicaciones`);
    expect((await respuesta).status()).toBe(200);
  });

  test("cerrar sesión vuelve al login y protege las páginas", async ({ page }) => {
    await page.goto(`${ERP_URL}/dashboard`);
    await page.getByText("Cerrar sesión").click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto(`${ERP_URL}/dashboard`);
    await expect(page).toHaveURL(/\/login/);
  });
});

test("sin sesión, el ERP pide iniciar sesión", async ({ page }) => {
  await page.goto(`${ERP_URL}/postulantes`);
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  await expect(page.locator("#email")).toBeEditable();
  await expect(page.locator("#password")).toHaveAttribute("type", "password");
});
