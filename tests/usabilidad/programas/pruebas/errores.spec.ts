// 2 · PROTECCIÓN CONTRA ERRORES DEL USUARIO: el sistema evita que el usuario pierda trabajo o cometa un
// error grave, y le dice cómo corregirlo. Ninguna prueba envía formularios ni confirma borrados.
import { test, expect } from "./base";
import { ERP_URL, PORTAL_URL, SESION_ADMIN } from "../playwright.config";

test.describe("con rol Admin", () => {
  test.use({ storageState: SESION_ADMIN });

  test("CP-USAB-07 · salir de un formulario con datos sin guardar pide confirmación", async ({ page }) => {
    await page.goto(`${ERP_URL}/postulantes/nuevo`);
    await page.getByPlaceholder("Ej: Juan Carlos").pressSequentially("Ana María"); // escribe como un usuario
    await page.screenshot({ path: test.info().outputPath("formulario.png") });
    let aviso: string | null = null;
    page.on("dialog", async (dialogo) => {
      aviso = dialogo.type();
      await dialogo.dismiss(); // "Quedarse en la página"
    });
    await page.reload({ timeout: 8_000 }).catch(() => {}); // si aparece el aviso, la recarga se cancela
    expect(aviso, "el navegador debía preguntar antes de salir (beforeunload)").toBe("beforeunload");
    await expect(page.getByPlaceholder("Ej: Juan Carlos")).toHaveValue("Ana María"); // no se perdió nada
  });

  test("CP-USAB-08 · borrar una empresa pide confirmación explícita (y se puede cancelar)", async ({ page }) => {
    await page.goto(`${ERP_URL}/empresas`);
    await page.getByTitle("Eliminar empresa").first().click();
    const dialogo = page.getByRole("alertdialog");
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByRole("button", { name: "Cancelar" })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("dialogo.png") });
    await dialogo.getByRole("button", { name: "Cancelar" }).click(); // NO se borra nada
    await expect(dialogo).toBeHidden();
  });
});

test("CP-USAB-09 · el registro del portal guía la contraseña y detecta que no coinciden", async ({ page }) => {
  await page.goto(`${PORTAL_URL}/registro`);
  await page.locator("#nombres").fill("Prueba");
  await page.locator("#apellidos").fill("Usabilidad");
  await page.locator("#documentoNumero").fill("12345678");
  await page.locator("#email").fill("prueba.usabilidad@example.com");
  await page.locator("#password").fill("Clave1234");
  await expect(page.locator("#password").locator("xpath=..").getByText(/débil|media|fuerte|segura/i)).toBeVisible(); // medidor de fortaleza
  await page.locator("#confirmarPassword").fill("Clave9999"); // distinta a propósito: el formulario NO se envía
  await page.locator('input[type="checkbox"][required]').first().check(); // consentimiento (Ley 29733)
  await page.getByRole("button", { name: /crear cuenta/i }).click();
  await expect(page.getByText("Las contraseñas no coinciden.")).toBeVisible();
});
