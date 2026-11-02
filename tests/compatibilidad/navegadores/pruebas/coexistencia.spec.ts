// Caso E4 (navegador) — el ERP y el portal abiertos a la vez en el MISMO navegador no comparten
// sesión: cada uno guarda su cookie en su propio dominio de CloudFront.
import { test, expect } from "./base";
import { ERP_URL, PORTAL_URL, SESION_ERP } from "../playwright.config";

test.use({ storageState: SESION_ERP });

test("con sesión en el ERP, el portal sigue sin sesión y funciona", async ({ page, context }) => {
  await page.goto(`${PORTAL_URL}/perfil`);
  await expect(page).toHaveURL(/\/login\?siguiente=/); // la sesión del ERP no abre el portal

  const portal = await context.cookies(PORTAL_URL);
  expect(portal.map((c) => c.name)).not.toContain("authToken");
  const erp = await context.cookies(ERP_URL);
  expect(erp.find((c) => c.name === "authToken")?.httpOnly).toBe(true); // JavaScript no puede leerla
});

test("las dos aplicaciones funcionan al mismo tiempo en pestañas del mismo navegador", async ({ context, isMobile }) => {
  test.skip(isMobile, "el ERP no es una aplicación móvil");
  const pestanaErp = await context.newPage();
  const pestanaPortal = await context.newPage();

  await Promise.all([pestanaErp.goto(`${ERP_URL}/postulantes`), pestanaPortal.goto(PORTAL_URL)]);

  await expect(pestanaErp.locator("tbody tr").first()).toBeVisible();
  await expect(pestanaPortal.locator("h3").first()).toBeVisible();
});
