// Inicia sesión en el ERP una sola vez y guarda la sesión (cookie httpOnly) para todos los navegadores.
import { test as setup, expect } from "@playwright/test";
import { ERP_URL, SESION_ERP } from "../playwright.config";

setup("iniciar sesión en el ERP", async ({ page }) => {
  const email = process.env.ERP_EMAIL;
  const password = process.env.ERP_PASSWORD;
  if (!email || !password) throw new Error("Define ERP_EMAIL y ERP_PASSWORD (usuario de prueba del ERP)");

  await page.goto(`${ERP_URL}/login`);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page).not.toHaveURL(/\/login/);
  await page.context().storageState({ path: SESION_ERP });
});
