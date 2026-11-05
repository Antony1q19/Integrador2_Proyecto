// Inicia sesión UNA vez por rol (Admin y RRHH) y guarda la sesión para todas las pruebas.
// No prueba contraseñas incorrectas, para no activar el bloqueo de 5 intentos fallidos.
import { test as setup, expect } from "@playwright/test";
import { ERP_URL, SESION_ADMIN, SESION_RRHH } from "../playwright.config";

const password = process.env.ERP_PASSWORD;

for (const [email, archivo] of [
  [process.env.ERP_EMAIL ?? "admin@test.com", SESION_ADMIN],
  [process.env.ERP_EMAIL_RRHH ?? "rrhh@test.com", SESION_RRHH],
]) {
  setup(`iniciar sesión como ${email}`, async ({ page }) => {
    if (!password) throw new Error("Define ERP_PASSWORD (usuarios de prueba del ERP)");
    await page.goto(`${ERP_URL}/login`);
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).not.toHaveURL(/\/login/);
    await page.context().storageState({ path: archivo });
  });
}
