// Casos que necesitan DATOS DE PRUEBA (autorizado por el equipo el 05-11-2026). Crea en AWS:
//   · 1 postulante de prueba «Prueba Usabilidad QA» (correo del simulador de SES: no llega a nadie)
//   · su CV de prueba (PDF de 1 KB) y 1 postulación al anuncio de la empresa de prueba
//   · 1 entrevista que al final se CANCELA
// Solo corre con:  $env:FLUJO_DATOS_PRUEBA="1"; npx playwright test --project=flujo
import { test, expect, type Browser, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { ERP_URL, PORTAL_URL, SESION_ADMIN, EVIDENCIAS } from "../playwright.config";

test.skip(!process.env.FLUJO_DATOS_PRUEBA, "crea datos de prueba: define FLUJO_DATOS_PRUEBA=1");
test.describe.configure({ mode: "serial" });

// FLUJO_SELLO reutiliza el postulante de prueba ya creado (no se crea otra cuenta).
const REUSAR = Boolean(process.env.FLUJO_SELLO);
const SELLO = process.env.FLUJO_SELLO ?? Date.now().toString().slice(-7);
const POSTULANTE = {
  nombres: "Prueba", apellidos: "Usabilidad QA", documento: `9${SELLO}`,
  email: `success+usabilidad${SELLO}@simulator.amazonses.com`, telefono: "987654321", password: "Usabilidad2026",
};
const ANUNCIO = process.env.ANUNCIO_PRUEBA ?? "Analista de Pruebas QA"; // de «Empresa de Prueba Nueva»
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");

let portal: Page;
const medido: Record<string, unknown> = { postulante: POSTULANTE.email };

async function evidencia(page: Page, nombre: string, foco?: import("@playwright/test").Locator) {
  mkdirSync(EVIDENCIAS, { recursive: true });
  if (foco) await foco.evaluate((el) => el.scrollIntoView({ block: "center" })).catch(() => {}); // que se vea lo medido
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${EVIDENCIAS}/${nombre}.png` });
}

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  portal = await (await browser.newContext({ viewport: { width: 1366, height: 800 }, locale: "es-PE" })).newPage();
});

test.afterAll(async () => {
  writeFileSync(`${EVIDENCIAS}/flujo-datos-prueba.json`, JSON.stringify(medido, null, 2));
  await portal.context().close();
});

test("CP-USAB-05 · el perfil muestra cuánto falta completar y se actualiza al subir el CV", async () => {
  if (REUSAR) {
    await portal.goto(`${PORTAL_URL}/login`);
    await portal.locator("#email").fill(POSTULANTE.email);
    await portal.locator("#password").fill(POSTULANTE.password);
    await portal.getByRole("button", { name: "Ingresar" }).click();
    await expect(portal).not.toHaveURL(/\/login/, { timeout: 30_000 });
    await portal.goto(`${PORTAL_URL}/perfil`);
    // Si una corrida anterior dejó el CV de prueba, se elimina para medir desde el perfil sin CV.
    const cvPrevio = portal.getByText("cv-prueba-usabilidad.pdf");
    if (await cvPrevio.waitFor({ timeout: 10_000 }).then(() => true, () => false)) {
      await cvPrevio.locator("xpath=ancestor::div[contains(@class,'justify-between')][1]").locator("button").last().click();
      await expect(cvPrevio).toBeHidden({ timeout: 30_000 });
    }
  } else {
  await portal.goto(`${PORTAL_URL}/registro`);
  await portal.locator("#nombres").fill(POSTULANTE.nombres);
  await portal.locator("#apellidos").fill(POSTULANTE.apellidos);
  await portal.locator("#documentoNumero").fill(POSTULANTE.documento);
  await portal.locator("#email").fill(POSTULANTE.email);
  await portal.locator("#telefono").fill(POSTULANTE.telefono);
  await portal.locator("#password").fill(POSTULANTE.password);
  await portal.locator("#confirmarPassword").fill(POSTULANTE.password);
  await portal.locator('input[type="checkbox"][required]').first().check();
  await portal.getByRole("button", { name: /crear cuenta/i }).click();
  await expect(portal).toHaveURL(/\/perfil/, { timeout: 30_000 });
  }

  const barra = portal.getByText("Completitud de tu Perfil Laboral");
  await expect(barra).toBeVisible();
  const inicial = portal.getByText(/\d+% completado/);
  await expect(inicial).toBeVisible();
  medido["completitud_inicial"] = await inicial.textContent();
  await evidencia(portal, "CP-USAB-05-inicial", barra);
  expect(medido["completitud_inicial"]).toBe("35% completado"); // datos básicos 20 + teléfono 15
});

test("CP-USAB-10 · el CV rechaza formatos y tamaños no permitidos y acepta un PDF válido", async () => {
  await portal.goto(`${PORTAL_URL}/perfil`);
  // El input del CV (el otro input de archivo de la página es el de la foto de perfil).
  const archivo = portal.locator('input[type="file"][accept=".pdf,.jpg,.jpeg,.png"]');

  await archivo.setInputFiles({ name: "cv.txt", mimeType: "text/plain", buffer: Buffer.from("no soy un PDF") });
  await expect(portal.getByText(/Formato no permitido/)).toBeVisible();
  await evidencia(portal, "CP-USAB-10-formato", portal.getByText(/Formato no permitido/));

  await archivo.setInputFiles({ name: "cv-grande.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(6 * 1024 * 1024, 0x20) });
  await expect(portal.getByText(/supera 5 MB/)).toBeVisible();
  await evidencia(portal, "CP-USAB-10-tamano", portal.getByText(/supera 5 MB/));

  await archivo.setInputFiles({ name: "cv-prueba-usabilidad.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(portal.getByText("cv-prueba-usabilidad.pdf")).toBeVisible({ timeout: 30_000 });
  await evidencia(portal, "CP-USAB-10", portal.getByText("cv-prueba-usabilidad.pdf"));

  // CP-USAB-05 (continuación): con el CV el porcentaje sube 30 puntos.
  await portal.reload();
  const despues = portal.getByText(/\d+% completado/);
  await expect(despues).toBeVisible();
  medido["completitud_con_cv"] = await despues.textContent();
  await evidencia(portal, "CP-USAB-05", portal.getByText("Completitud de tu Perfil Laboral"));
  expect(medido["completitud_con_cv"]).toBe("65% completado");
});

test("CP-USAB-12a · el postulante se postula a un anuncio (dato de prueba)", async () => {
  await portal.goto(PORTAL_URL);
  await portal.waitForLoadState("networkidle");
  await portal.locator("h3", { hasText: ANUNCIO }).first().click();
  await portal.waitForLoadState("networkidle"); // que la página termine de hidratarse antes del clic
  const boton = portal.getByRole("button", { name: /Postularme a esta oferta/ });
  const yaPostulado = portal.getByRole("button", { name: /Ya postulado/i });
  await expect(boton.or(yaPostulado)).toBeVisible();
  if (await boton.isVisible()) {
    await boton.click();
    // Primera vez: «¡Te postulaste correctamente!» y lleva al historial. Si ya existía, el backend avisa.
    await expect(portal.getByText(/Te postulaste correctamente|ya está postulado|Ya te postulaste/i).or(portal.getByText("Historial de Postulaciones")))
      .toBeVisible({ timeout: 30_000 });
  } // si ya dice «Ya postulado», la postulación de prueba existe de una corrida anterior
  await portal.goto(`${PORTAL_URL}/his_postulaciones`);
  await expect(portal.getByText(ANUNCIO).first()).toBeVisible();
  await evidencia(portal, "CP-USAB-12-primera");
});

test("CP-USAB-11 · un doble clic en «Programar» crea UNA sola entrevista", async ({ browser }) => {
  const erp = await (await browser.newContext({ storageState: SESION_ADMIN, viewport: { width: 1366, height: 800 } })).newPage();
  const envios: string[] = [];
  erp.on("request", (r) => { if (r.method() === "POST" && /entrevistas/.test(r.url())) envios.push(r.url()); });
  await erp.goto(`${ERP_URL}/entrevistas`);
  await erp.getByRole("button", { name: /Programar entrevista/ }).click();
  const dialogo = erp.getByRole("dialog");
  await dialogo.locator("select").first().selectOption({ label: `${POSTULANTE.apellidos}, ${POSTULANTE.nombres}` });
  const manana = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
  await dialogo.locator('input[type="datetime-local"]').fill(`${manana}T10:00`);
  await dialogo.getByPlaceholder("Nombre").fill(`Prueba Usabilidad ${SELLO}`);
  await evidencia(erp, "CP-USAB-11-formulario");
  await dialogo.getByRole("button", { name: "Programar" }).dblclick();
  await expect(erp.getByRole("status").filter({ hasText: "Entrevista programada" })).toBeVisible({ timeout: 30_000 });
  await evidencia(erp, "CP-USAB-11");
  medido["envios_post_entrevista"] = envios.length;
  expect(envios.length, "solicitudes POST de entrevista tras el doble clic").toBe(1);
  await erp.context().close();
});

test("CP-USAB-15 · cada operación avisa con un toast (programar y cancelar)", async ({ browser }) => {
  const erp = await (await browser.newContext({ storageState: SESION_ADMIN, viewport: { width: 1366, height: 800 } })).newPage();
  await erp.goto(`${ERP_URL}/entrevistas`);
  const fila = erp.locator("li, tr, div").filter({ hasText: `Prueba Usabilidad ${SELLO}` }).filter({ has: erp.getByRole("button", { name: "Cancelar" }) }).last();
  await expect(fila).toBeVisible();
  await fila.getByRole("button", { name: "Cancelar" }).click();
  await erp.getByRole("alertdialog").getByRole("button", { name: "Cancelar entrevista" }).click(); // limpia el dato de prueba
  const toast = erp.getByRole("status").filter({ hasText: "Entrevista cancelada" });
  await expect(toast).toBeVisible({ timeout: 30_000 });
  await evidencia(erp, "CP-USAB-15");
  medido["toast"] = await toast.textContent();
  await erp.context().close();
});

test("CP-USAB-12 · un anuncio al que ya postuló se ve como «Ya postulado» y no admite otra postulación", async () => {
  // Vuelve al MISMO anuncio, como haría un postulante que no recuerda si ya postuló.
  await portal.goto(PORTAL_URL);
  await portal.waitForLoadState("networkidle");
  await portal.locator("h3", { hasText: ANUNCIO }).first().click();
  await portal.waitForLoadState("networkidle");
  await expect(portal.getByRole("heading", { level: 2, name: ANUNCIO })).toBeVisible();
  const yaPostulado = portal.getByRole("button", { name: /Ya postulado/i });
  medido["boton_ya_postulado_visible"] = await yaPostulado.isVisible();
  if (!medido["boton_ya_postulado_visible"]) {
    // Sin indicador: el postulante vuelve a hacer clic y el backend lo frena (409).
    await portal.getByRole("button", { name: /Postularme a esta oferta/ }).click();
    const aviso = portal.getByText(/ya está postulado/i);
    await expect(aviso).toBeVisible({ timeout: 30_000 });
    medido["mensaje_backend"] = await aviso.textContent();
  }
  await evidencia(portal, "CP-USAB-12");
  await expect(yaPostulado, "el botón debía indicar «Ya postulado» y estar deshabilitado").toBeDisabled({ timeout: 5_000 });
});
