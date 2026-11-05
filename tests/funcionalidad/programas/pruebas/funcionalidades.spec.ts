// ADECUACIÓN FUNCIONAL (ISO/IEC 25010) de cada funcionalidad de TalentERP, en el sistema real (AWS).
//   · Completitud: la funcionalidad existe y cubre la tarea del usuario.
//   · Corrección:  da el resultado correcto (datos, cálculos, validaciones).
//   · Idoneidad:   lleva al objetivo sin estados inconsistentes ni pasos de más (reglas de negocio, permisos).
// Cada verificación queda en evidencias/verificaciones.json con lo esperado y lo obtenido. Las pruebas NO se
// detienen en el primer error: se registra todo y la última prueba falla si alguna verificación no se cumplió.
import { test, expect, type APIRequestContext, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { ERP_URL, PORTAL_URL, EVIDENCIAS } from "../playwright.config";

test.skip(!process.env.DATOS_PRUEBA, "crea datos de prueba en AWS: define DATOS_PRUEBA=1");
test.describe.configure({ mode: "serial" });

type Sub = "Completitud" | "Corrección" | "Idoneidad";
interface Verificacion { id: string; funcionalidad: string; sub: Sub; que: string; esperado: string; obtenido: string; ok: boolean; evidencia?: string }
const VERIFICACIONES: Verificacion[] = [];
const FUNC: Record<string, string> = {};

const SELLO = process.env.SELLO ?? Date.now().toString().slice(-7);
const PASSWORD = process.env.ERP_PASSWORD ?? "";
const POSTULANTE_PORTAL = { email: process.env.PORTAL_EMAIL ?? "success+usabilidad1824251@simulator.amazonses.com",
  password: process.env.PORTAL_PASSWORD ?? "Usabilidad2026" };
const hoyPeru = () => new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
const masDias = (fecha: string, dias: number) => new Date(new Date(`${fecha}T12:00:00Z`).getTime() + dias * 86_400_000).toISOString().slice(0, 10);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");

// Datos creados durante el flujo
const D: Record<string, any> = { sello: SELLO };
let admin: BrowserContext, adminPage: Page, api: APIRequestContext;

function v(id: string, sub: Sub, que: string, esperado: unknown, obtenido: unknown, ok?: boolean, evidencia?: string) {
  // Objetos con las claves ordenadas: el orden de las claves no cambia el resultado.
  const canon = (x: unknown) => typeof x === "string" ? x
    : x && typeof x === "object" && !Array.isArray(x) ? JSON.stringify(x, Object.keys(x as object).sort()) : JSON.stringify(x);
  const e = canon(esperado);
  const o = canon(obtenido);
  const cumple = ok ?? e === o;
  VERIFICACIONES.push({ id, funcionalidad: FUNC[id.slice(0, 3)], sub, que, esperado: e, obtenido: o, ok: cumple, evidencia });
  console.log(`${cumple ? "✓" : "✗"} ${id} [${sub}] ${que} · esperado ${e} · obtenido ${o}`);
}

async function llamar(metodo: string, ruta: string, cuerpo?: unknown, ctx: APIRequestContext = api) {
  const opciones: Record<string, unknown> = { failOnStatusCode: false };
  if (cuerpo !== undefined) opciones.data = cuerpo;
  const r = await ctx.fetch(`${ERP_URL}${ruta}`, { method: metodo, ...opciones });
  const texto = await r.text();
  let datos: any = texto;
  try { datos = JSON.parse(texto); } catch { /* no es JSON */ }
  return { status: r.status(), datos };
}

async function seVe(loc: ReturnType<Page["locator"]>, ms = 15_000) {
  // Solo elementos visibles: el mismo texto puede estar oculto (p. ej. en las opciones de un filtro).
  return loc.filter({ visible: true }).first().waitFor({ state: "visible", timeout: ms }).then(() => true, () => false);
}

async function foto(page: Page, nombre: string, foco?: ReturnType<Page["locator"]>) {
  mkdirSync(EVIDENCIAS, { recursive: true });
  if (foco) await foco.first().evaluate((el) => el.scrollIntoView({ block: "center" }), undefined, { timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${EVIDENCIAS}/${nombre}.png` });
  return `${nombre}.png`;
}

async function sesionErp(browser: Browser, email: string) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 800 }, locale: "es-PE" });
  const page = await ctx.newPage();
  await page.goto(`${ERP_URL}/login`);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 }).catch(() => {});
  return { ctx, page, entro: !page.url().includes("/login") };
}

Object.assign(FUNC, {
  F01: "Autenticación y roles", F02: "Usuarios del ERP", F03: "Empresas clientes", F04: "Anuncios (vacantes)",
  F05: "Postulantes", F06: "Documentos del postulante", F07: "Postulaciones y pipeline", F08: "Evaluaciones por competencias",
  F09: "Entrevistas", F10: "Contrataciones", F11: "Seguimiento post-ingreso", F12: "Dashboard y reportes",
  F13: "Comunicaciones (WhatsApp)", F14: "Ayuda", F15: "Portal: búsqueda de ofertas", F16: "Portal: postulación e historial",
  F17: "Portal: perfil del postulante",
});

test.beforeAll(async ({ browser }) => {
  const s = await sesionErp(browser, "admin@test.com");
  admin = s.ctx; adminPage = s.page; api = admin.request;
});

test.afterAll(async () => {
  mkdirSync(EVIDENCIAS, { recursive: true });
  writeFileSync(`${EVIDENCIAS}/verificaciones.json`, JSON.stringify({ fecha: new Date().toISOString(), datos: D, funcionalidades: FUNC, verificaciones: VERIFICACIONES }, null, 2));
  await admin?.close();
});

// ------------------------------------------------------------------ F01 · F02 · F13 · F14 (sin crear datos)
test("F01 · autenticación y roles", async ({ browser }) => {
  const roles: Record<string, boolean> = {};
  for (const email of ["rrhh@test.com", "super@test.com"]) {
    const s = await sesionErp(browser, email);
    roles[email] = s.entro;
    if (email === "rrhh@test.com") {
      await s.page.goto(`${ERP_URL}/dashboard`);
      v("F01-I1", "Idoneidad", "RRHH no ve el Dashboard: se le redirige a Postulantes", "/postulantes", new URL(s.page.url()).pathname);
    } else {
      const r = await llamar("POST", "/api/empresas", { razonSocial: "NO DEBE CREARSE", ruc: "20999999999", contactoNombre: "x",
        contactoEmail: "x@example.com", contactoTelefono: "987654321" }, s.ctx.request);
      v("F01-I2", "Idoneidad", "El Supervisor no puede crear empresas (solo el Admin)", "403", String(r.status));
      if (r.status === 201) await llamar("DELETE", `/api/empresas/${r.datos.id}`);
    }
    await s.ctx.close();
  }
  roles["admin@test.com"] = !adminPage.url().includes("/login");
  v("F01-C1", "Completitud", "Los 3 roles (Admin, RRHH, Supervisor) inician sesión", { "admin@test.com": true, "rrhh@test.com": true, "super@test.com": true }, roles);
  const sinSesion = await llamar("GET", "/api/postulantes", undefined, (await browser.newContext()).request);
  v("F01-O1", "Corrección", "Sin sesión, los datos del ERP no se entregan", "401", String(sinSesion.status));
  await adminPage.goto(`${ERP_URL}/dashboard`);
  v("F01-O2", "Corrección", "El Admin entra a su inicio (Dashboard)", "/dashboard", new URL(adminPage.url()).pathname, undefined, await foto(adminPage, "F01-admin-dashboard"));
});

test("F02 · usuarios del ERP", async () => {
  const r = await llamar("GET", "/api/usuarios");
  const lista = Array.isArray(r.datos) ? r.datos : r.datos?.items ?? [];
  v("F02-C1", "Completitud", "Se listan los usuarios del ERP", "200 y al menos 3 usuarios", `${r.status} y ${lista.length} usuarios`, r.status === 200 && lista.length >= 3);
  const rol = (correo: string) => lista.find((u: any) => (u.email ?? "").toLowerCase() === correo)?.rol;
  v("F02-O1", "Corrección", "Cada usuario de prueba tiene su rol", { admin: "Admin", rrhh: "RRHH", super: "Supervisor" },
    { admin: rol("admin@test.com"), rrhh: rol("rrhh@test.com"), super: rol("super@test.com") });
  await adminPage.goto(`${ERP_URL}/perfil`);
  await adminPage.getByRole("button", { name: /Gestión de Trabajadores/ }).click().catch(() => {});
  const visto = await seVe(adminPage.getByText("rrhh@test.com"));
  v("F02-I1", "Idoneidad", "El Admin gestiona a los trabajadores desde su perfil (pestaña Gestión de Trabajadores)", "visible",
    visto ? "visible" : "no visible", undefined, await foto(adminPage, "F02-usuarios"));
});

test("F13 · comunicaciones de WhatsApp (solo lectura)", async () => {
  const conv = await llamar("GET", "/api/comunicaciones");
  v("F13-C1", "Completitud", "Se listan las conversaciones de WhatsApp", "200", String(conv.status));
  const pl = await llamar("GET", "/api/comunicaciones/plantillas");
  const plantillas = Array.isArray(pl.datos) ? pl.datos : pl.datos?.plantillas ?? pl.datos?.items ?? [];
  v("F13-C2", "Completitud", "Se listan las plantillas aprobadas por Meta", "200 y al menos 1", `${pl.status} y ${plantillas.length}`, pl.status === 200 && plantillas.length > 0);
  const completas = plantillas.every((p: any) => p.nombre ?? p.name);
  v("F13-O1", "Corrección", "Cada plantilla trae su nombre e idioma desde Meta", "todas", completas ? "todas" : "faltan datos", completas);
  await adminPage.goto(`${ERP_URL}/comunicaciones/plantillas`);
  const ev = await foto(adminPage, "F13-plantillas");
  v("F13-I1", "Idoneidad", "Las plantillas se ven en el ERP para usarlas en los chats (no se envió ningún mensaje)", "pantalla de plantillas",
    new URL(adminPage.url()).pathname === "/comunicaciones/plantillas" ? "pantalla de plantillas" : adminPage.url(), undefined, ev);
});

test("F14 · ayuda", async () => {
  await adminPage.goto(`${ERP_URL}/ayuda`);
  const modulos = ["Postulantes", "Entrevistas", "Contrataciones", "Anuncios", "Empresas"];
  const presentes = [];
  for (const m of modulos) if (await adminPage.getByText(m, { exact: true }).first().isVisible().catch(() => false)) presentes.push(m);
  v("F14-C1", "Completitud", "La ayuda explica cada módulo", modulos, presentes, presentes.length === modulos.length, await foto(adminPage, "F14-ayuda"));
  await adminPage.getByPlaceholder(/Buscar: entrevista/).fill("contratación");
  await adminPage.waitForTimeout(800);
  const visible = await adminPage.getByText(/contrataci/i).first().isVisible();
  v("F14-O1", "Corrección", "El buscador de la ayuda encuentra «contratación»", "con resultados", visible ? "con resultados" : "sin resultados", visible);
  v("F14-I1", "Idoneidad", "La ayuda está a un clic, en el menú lateral", "en el menú", (await adminPage.getByRole("link", { name: "Ayuda" }).count()) > 0 ? "en el menú" : "no", undefined);
});

// ------------------------------------------------------------------ F03 · F04 empresas y anuncios
test("F03 · empresas clientes", async () => {
  const empresa = { razonSocial: `PRUEBA FUNCIONAL ${SELLO} S.A.C.`, ruc: `20${SELLO}99`, sector: "Tecnología",
    contactoNombre: "Ana Prueba", contactoEmail: "ana.prueba@example.com", contactoTelefono: "987654321" };
  const r = await llamar("POST", "/api/empresas", empresa);
  D.empresa = r.datos;
  v("F03-C1", "Completitud", "Se registra una empresa cliente", "201", String(r.status));
  v("F03-O1", "Corrección", "La empresa guarda razón social y RUC tal cual", { razonSocial: empresa.razonSocial, ruc: empresa.ruc },
    { razonSocial: r.datos?.razonSocial, ruc: r.datos?.ruc });
  const malo = await llamar("POST", "/api/empresas", { ...empresa, ruc: "2012345678" });
  v("F03-O2", "Corrección", "Un RUC de 10 dígitos se rechaza", "400 o 422", String(malo.status), [400, 422].includes(malo.status));
  const dup = await llamar("POST", "/api/empresas", { ...empresa, razonSocial: "Otra razón" });
  v("F03-O3", "Corrección", "Un RUC repetido se rechaza", "409", String(dup.status));
  const edit = await llamar("PUT", `/api/empresas/${D.empresa.id}`, { ...empresa, sector: "Retail" });
  v("F03-C2", "Completitud", "Se editan los datos de la empresa", "200 · sector Retail", `${edit.status} · sector ${edit.datos?.sector}`, edit.status === 200 && edit.datos?.sector === "Retail");
  await adminPage.goto(`${ERP_URL}/empresas/${D.empresa.id}`);
  v("F03-C3", "Completitud", "La ficha de la empresa muestra sus datos", "visible", (await seVe(adminPage.getByText(empresa.razonSocial))) ? "visible" : "no",
    undefined, await foto(adminPage, "F03-empresa"));
});

test("F04 · anuncios (vacantes)", async () => {
  const hoy = hoyPeru();
  const anuncio = { empresaId: D.empresa.id, cargo: `QA Funcional ${SELLO}`, descripcion: "Anuncio de PRUEBA para la verificación funcional.",
    requisitos: "Ninguno (prueba)", numeroVacantes: 1, salarioMin: 3000, salarioMax: 4000, fechaLimite: masDias(hoy, 30) };
  const r = await llamar("POST", "/api/anuncios", anuncio);
  D.anuncio = r.datos;
  v("F04-C1", "Completitud", "Se publica un anuncio para la empresa", "201", String(r.status));
  v("F04-O1", "Corrección", "El anuncio nace «Abierto» y con la razón social de su empresa", { estado: "Abierto", empresa: D.empresa.razonSocial },
    { estado: r.datos?.estado, empresa: r.datos?.empresaRazonSocial });
  const sal = await llamar("POST", "/api/anuncios", { ...anuncio, salarioMin: 5000, salarioMax: 4000 });
  v("F04-O2", "Corrección", "Salario máximo menor que el mínimo se rechaza", "400 o 422", String(sal.status), [400, 422].includes(sal.status));
  const fec = await llamar("POST", "/api/anuncios", { ...anuncio, fechaLimite: masDias(hoy, -1) });
  v("F04-O3", "Corrección", "Una fecha límite pasada se rechaza", "400 o 422", String(fec.status), [400, 422].includes(fec.status));
  const borrar = await llamar("DELETE", `/api/empresas/${D.empresa.id}`);
  v("F03-I1", "Idoneidad", "No se puede borrar una empresa con anuncios activos", "409", String(borrar.status));
  await adminPage.goto(`${ERP_URL}/anuncios/${D.anuncio.id}`);
  v("F04-C2", "Completitud", "La ficha del anuncio muestra cargo, salario y vacantes", "visible", (await seVe(adminPage.getByText(anuncio.cargo))) ? "visible" : "no",
    undefined, await foto(adminPage, "F04-anuncio"));
});

// ------------------------------------------------------------------ F15 · F16 · F17 portal
test("F15 · portal: búsqueda de ofertas", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  const lista = await (await ctx.request.get(`${PORTAL_URL}/api/anuncios`)).json();
  const publicado = (lista as any[]).find((a) => a.id === D.anuncio.id);
  v("F15-C1", "Completitud", "El anuncio recién publicado aparece en el portal", "publicado", publicado ? "publicado" : "no aparece");
  v("F15-O1", "Corrección", "El portal muestra el mismo salario y vacantes", { salarioMin: 3000, salarioMax: 4000, vacantes: 1 },
    { salarioMin: publicado?.salarioMin, salarioMax: publicado?.salarioMax, vacantes: publicado?.numeroVacantes });
  // La portada guarda los anuncios 60 s en caché (app/page.tsx): se espera hasta 75 s a que aparezca.
  const inicio = Date.now();
  let titulos: string[] = [];
  while (Date.now() - inicio < 75_000) {
    await page.goto(PORTAL_URL);
    await page.waitForLoadState("networkidle");
    await page.getByPlaceholder("Puesto, empresa o palabra clave").fill(`QA Funcional ${SELLO}`);
    await page.waitForTimeout(800);
    titulos = await page.locator("h3").allTextContents();
    if (titulos.length) break;
    await page.waitForTimeout(10_000);
  }
  D.segundosHastaPortada = Math.round((Date.now() - inicio) / 1000);
  // Con un solo resultado se abre su ficha al lado, que tiene sus propios títulos (h3): no son tarjetas.
  titulos = titulos.filter((x) => !["Información del empleo", "Descripción del puesto", "Requisitos"].includes(x.trim()));
  v("F15-I1", "Idoneidad", "Buscar por el cargo deja solo ese anuncio", `1 · QA Funcional ${SELLO}`, `${titulos.length} · ${titulos.join(", ")}`,
    titulos.length === 1 && titulos[0].includes(SELLO), await foto(page, "F15-portal-busqueda"));
  await ctx.close();
});

test("F16 · portal: postulación e historial · F17 perfil", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(`${PORTAL_URL}/login`);
  await page.locator("#email").fill(POSTULANTE_PORTAL.email);
  await page.locator("#password").fill(POSTULANTE_PORTAL.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });
  await page.goto(`${PORTAL_URL}/perfil`);
  await page.waitForLoadState("networkidle");
  const nombre = await page.getByText("Prueba Usabilidad QA").first().isVisible();
  v("F17-C1", "Completitud", "El perfil del postulante muestra sus datos y su CV", "visible", nombre ? "visible" : "no", undefined, await foto(page, "F17-perfil"));
  const completitud = await page.getByText(/\d+% completado/).first().textContent();
  v("F17-O1", "Corrección", "La completitud del perfil corresponde a datos + teléfono + CV", "65% completado", completitud ?? "");
  await page.goto(`${PORTAL_URL}/anuncios/${D.anuncio.id}`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /Postularme a esta oferta/ }).click();
  await page.waitForURL(/his_postulaciones/, { timeout: 30_000 }).catch(() => {});
  await page.waitForLoadState("networkidle");
  const enHistorial = await seVe(page.getByText(`QA Funcional ${SELLO}`));
  v("F16-C1", "Completitud", "El postulante se postula desde el portal y lo ve en su historial", "en el historial", enHistorial ? "en el historial" : "no aparece",
    undefined, await foto(page, "F16-historial", page.getByText(`QA Funcional ${SELLO}`)));
  const procesos = await llamar("GET", `/api/procesos`);
  const delAnuncio = (Array.isArray(procesos.datos) ? procesos.datos : []).filter((p: any) => p.anuncioId === D.anuncio.id);
  D.procesoPortal = delAnuncio[0];
  v("F16-O1", "Corrección", "En el ERP aparece esa postulación en «Postulado»", "1 · POSTULADO", `${delAnuncio.length} · ${delAnuncio[0]?.estadoActual}`);
  await page.goto(`${PORTAL_URL}/anuncios/${D.anuncio.id}`);
  await page.waitForLoadState("networkidle");
  const ya = await page.getByRole("button", { name: /Ya postulado/ }).isDisabled().catch(() => false);
  v("F16-I1", "Idoneidad", "Al volver al anuncio no puede postularse otra vez", "«Ya postulado» deshabilitado", ya ? "«Ya postulado» deshabilitado" : "puede volver a postular",
    undefined, await foto(page, "F16-ya-postulado"));
  await ctx.close();
});

// ------------------------------------------------------------------ F05 · F06 postulantes y documentos
test("F05 · postulantes", async () => {
  const post = { nombres: "Prueba", apellidos: `Funcional ${SELLO}`, documentoTipo: "DNI", documentoNumero: `8${SELLO}`,
    email: `success+funcional${SELLO}@simulator.amazonses.com`, telefono: "987654321", fuenteReclutamiento: "PRUEBA",
    consentimientos: { tratamientoDatos: true, comunicacionesComerciales: false }, experiencia: [], formacionAcademica: [], idiomas: [] };
  const r = await llamar("POST", "/api/postulantes", post);
  D.postulante = r.datos;
  v("F05-C1", "Completitud", "Se registra un postulante en el ERP", "201", String(r.status));
  v("F05-O1", "Corrección", "Se guardan documento, correo y consentimiento (Ley 29733)", { documento: post.documentoNumero, email: post.email, consentimiento: true },
    { documento: r.datos?.documentoNumero, email: r.datos?.email, consentimiento: r.datos?.consentimientoTratamientoDatos });
  const dup = await llamar("POST", "/api/postulantes", { ...post, email: `success+funcional${SELLO}b@simulator.amazonses.com` });
  v("F05-O2", "Corrección", "Un número de documento repetido se rechaza", "409", String(dup.status));
  const tel = await llamar("POST", "/api/postulantes", { ...post, documentoNumero: `7${SELLO}`, email: `success+funcional${SELLO}c@simulator.amazonses.com`, telefono: "abc-123" });
  v("F05-O3", "Corrección", "Un teléfono con letras se rechaza", "400 o 422", String(tel.status), [400, 422].includes(tel.status));
  if (tel.status === 201) D.postulanteExtra = tel.datos;
  const lista = await llamar("GET", "/api/postulantes");
  const encontrado = (Array.isArray(lista.datos) ? lista.datos : lista.datos?.items ?? []).some((p: any) => p.id === D.postulante.id);
  v("F05-C2", "Completitud", "El postulante aparece en el listado", "en el listado", encontrado ? "en el listado" : "no aparece");
  v("F05-I1", "Idoneidad", "Registrado por RRHH/Admin: aún no tiene cuenta y se le puede invitar", "sin cuenta", r.datos?.tieneCuenta ? "con cuenta" : "sin cuenta");
  await adminPage.goto(`${ERP_URL}/postulantes/${D.postulante.id}`);
  await adminPage.waitForLoadState("networkidle");
  await foto(adminPage, "F05-ficha");
});

test("F06 · documentos del postulante", async () => {
  const subir = (nombre: string, buffer: Buffer, tipo = "CV") =>
    api.post(`${ERP_URL}/api/postulantes/${D.postulante.id}/documentos`, { multipart: { tipo, archivo: { name: nombre, mimeType: "application/pdf", buffer } }, failOnStatusCode: false });
  const ok = await subir("cv-prueba-funcional.pdf", PDF);
  D.documento = await ok.json().catch(() => ({}));
  v("F06-C1", "Completitud", "Se sube el CV del postulante", "201", String(ok.status()));
  const falso = await subir("virus.pdf", Buffer.from("MZ\x90\x00 esto es un ejecutable"));
  v("F06-O1", "Corrección", "Un archivo «.pdf» que no es PDF (magic bytes) se rechaza", "400", String(falso.status()));
  const vacio = await subir("vacio.pdf", Buffer.alloc(0));
  v("F06-O2", "Corrección", "Un archivo vacío se rechaza", "400 o 422", String(vacio.status()), [400, 422].includes(vacio.status()));
  const grande = await subir("grande.pdf", Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(5 * 1024 * 1024 - 8, 0x20)]));
  v("F06-O3", "Corrección", "5 MB + 1 byte se rechaza", "400 o 413", String(grande.status()), [400, 413].includes(grande.status()));
  const bajada = await api.get(`${ERP_URL}/api/postulantes/${D.postulante.id}/documentos/${D.documento.id}/archivo`, { failOnStatusCode: false });
  const igual = bajada.status() === 200 && Buffer.compare(await bajada.body(), PDF) === 0;
  v("F06-I1", "Idoneidad", "Se descarga exactamente el mismo archivo que se subió", "idéntico", igual ? "idéntico" : `HTTP ${bajada.status()} distinto`, igual);
  await adminPage.goto(`${ERP_URL}/postulantes/${D.postulante.id}`);
  await adminPage.getByRole("button", { name: "Documentos" }).click().catch(() => {});
  v("F06-C2", "Completitud", "El CV aparece en la pestaña Documentos de la ficha", "visible",
    (await adminPage.getByText("cv-prueba-funcional.pdf").first().isVisible().catch(() => false)) ? "visible" : "no", undefined, await foto(adminPage, "F06-documentos"));
});

// ------------------------------------------------------------------ F07 · F08 · F09 selección
test("F07 · postulaciones y pipeline", async () => {
  const r = await llamar("POST", "/api/procesos", { postulanteId: D.postulante.id, anuncioId: D.anuncio.id });
  v("F07-C1", "Completitud", "Se asocia el postulante al anuncio", "201 · POSTULADO", `${r.status} · ${r.datos?.estadoActual}`);
  const dup = await llamar("POST", "/api/procesos", { postulanteId: D.postulante.id, anuncioId: D.anuncio.id });
  v("F07-O1", "Corrección", "No se puede postular dos veces al mismo anuncio", "409", String(dup.status));
  const ruta = `/api/procesos/postulante/${D.postulante.id}/anuncio/${D.anuncio.id}/estado`;
  const mover = await llamar("PATCH", ruta, { estado: "EN_EVALUACION" });
  const procesos = await llamar("GET", `/api/procesos?postulanteId=${D.postulante.id}`);
  const proceso = (Array.isArray(procesos.datos) ? procesos.datos : []).find((p: any) => p.anuncioId === D.anuncio.id);
  v("F07-O2", "Corrección", "Mover a «En evaluación» cambia la etapa y deja 2 líneas de historial", "EN_EVALUACION · 2 registros",
    `${proceso?.estadoActual} · ${(proceso?.historialEstados ?? []).length} registros (respuesta: ${mover.datos?.estado})`,
    proceso?.estadoActual === "EN_EVALUACION" && (proceso?.historialEstados ?? []).length === 2);
  const igual = await llamar("PATCH", ruta, { estado: "EN_EVALUACION" });
  v("F07-I1", "Idoneidad", "Mover a la misma etapa se rechaza (no duplica historial)", "409", String(igual.status));
  const directo = await llamar("PATCH", ruta, { estado: "CONTRATADO" });
  v("F07-I2", "Idoneidad", "No se pasa a «Contratado» sin registrar la contratación", "409", String(directo.status));
  await llamar("PATCH", ruta, { estado: "ENTREVISTA" });
  await adminPage.goto(`${ERP_URL}/postulantes/pipeline`);
  await adminPage.waitForLoadState("networkidle");
  const tarjeta = adminPage.getByText(`QA Funcional ${SELLO}`); // el nombre se recorta («Prueba Funcional 6863…»): se busca por el puesto
  v("F07-C2", "Completitud", "La postulación se ve en el pipeline, en la columna Entrevista", "visible", (await seVe(tarjeta)) ? "visible" : "no",
    undefined, await foto(adminPage, "F07-pipeline", tarjeta));
});

test("F08 · evaluaciones por competencias", async () => {
  const comp = (n: number) => ({ comunicacionEfectiva: n, orientacionCliente: n, responsabilidad: n, adaptabilidadFlexibilidad: n, toleranciaPresion: n, dinamismoEnergia: n });
  const a = await llamar("POST", "/api/evaluaciones", { postulanteId: D.postulante.id, competencias: comp(4), comentarios: "PRUEBA funcional" });
  v("F08-C1", "Completitud", "Se registra una evaluación de 6 competencias", "201", String(a.status));
  v("F08-O1", "Corrección", "Seis competencias en 4 dan 80 puntos y APTO", "80 · APTO", `${a.datos?.puntajeTotal} · ${a.datos?.resultado}`);
  const b = await llamar("POST", "/api/evaluaciones", { postulanteId: D.postulante.id, competencias: comp(3), comentarios: "PRUEBA funcional", puntajeTotal: 100, resultado: "APTO" });
  v("F08-O2", "Corrección", "Seis en 3 dan 60 y NO_APTO (umbral 70)", "60 · NO_APTO", `${b.datos?.puntajeTotal} · ${b.datos?.resultado}`);
  v("F08-I1", "Idoneidad", "El puntaje lo calcula el servidor: enviar «100 · APTO» no cambia el resultado", "60 · NO_APTO", `${b.datos?.puntajeTotal} · ${b.datos?.resultado}`);
  const fuera = await llamar("POST", "/api/evaluaciones", { postulanteId: D.postulante.id, competencias: { ...comp(4), responsabilidad: 6 } });
  v("F08-O3", "Corrección", "Una competencia fuera de 1..5 se rechaza", "422", String(fuera.status));
  await adminPage.goto(`${ERP_URL}/postulantes/${D.postulante.id}`);
  await adminPage.getByRole("button", { name: "Evaluaciones" }).click().catch(() => {});
  v("F08-C2", "Completitud", "Las evaluaciones se ven en la ficha", "visible", (await seVe(adminPage.getByText(/80/))) ? "visible" : "no",
    undefined, await foto(adminPage, "F08-evaluaciones"));
});

test("F09 · entrevistas", async () => {
  test.setTimeout(300_000);
  const hoy = hoyPeru();
  // Dentro de 2 minutos (hora de Perú, como la envía el formulario: AAAA-MM-DDTHH:mm)
  const enPeru = new Date(Date.now() - 5 * 3600_000 + 2 * 60_000);
  const hora = enPeru.toISOString().slice(0, 16);
  const base = { postulanteId: D.postulante.id, anuncioId: D.anuncio.id, duracionMin: 30, modalidad: "Virtual", entrevistador: `Evaluador Funcional ${SELLO}` };
  const r = await llamar("POST", "/api/entrevistas", { ...base, fechaHora: hora, notas: "PRUEBA" });
  D.entrevista = r.datos;
  v("F09-C1", "Completitud", "Se programa una entrevista", "201 · Programada", `${r.status} · ${r.datos?.estado}`);
  const cruce = await llamar("POST", "/api/entrevistas", { ...base, fechaHora: new Date(enPeru.getTime() + 15 * 60_000).toISOString().slice(0, 16) });
  v("F09-O1", "Corrección", "El mismo entrevistador no puede tener dos entrevistas que se crucen", "409", String(cruce.status));
  if (cruce.status === 201) D.entrevistaExtra = cruce.datos;
  const antes = await llamar("PATCH", `/api/entrevistas/${D.entrevista.id}`, { estado: "Realizada", resultado: "Aprobada" });
  v("F09-O3", "Corrección", "No se marca «Realizada» una entrevista que aún no ocurre", "400", String(antes.status));
  const malo = await llamar("PATCH", `/api/entrevistas/${D.entrevista.id}`, { estado: "Terminada" });
  v("F09-I1", "Idoneidad", "Un estado que no existe se rechaza", "400 o 422", String(malo.status), [400, 422].includes(malo.status));

  // Idoneidad: el formulario y el servidor aplican la MISMA regla para una fecha pasada.
  const pasada = await llamar("POST", "/api/entrevistas", { ...base, entrevistador: `Otro Evaluador ${SELLO}`, fechaHora: `${hoy}T00:30` });
  if (pasada.status === 201) D.entrevistaPasada = pasada.datos;
  await adminPage.goto(`${ERP_URL}/entrevistas`);
  await adminPage.getByRole("button", { name: /Programar entrevista/ }).click();
  const dialogo = adminPage.getByRole("dialog");
  await dialogo.locator("select").first().selectOption({ label: `Funcional ${SELLO}, Prueba` }).catch(() => {});
  await dialogo.locator('input[type="datetime-local"]').fill(`${hoy}T00:30`);
  const promete = await seVe(dialogo.getByText(/Puedes guardarla igual/), 3_000);
  const avisa = await seVe(dialogo.getByText(/debe programarse en una fecha y hora futura/i), 3_000);
  const ev = await foto(adminPage, "F09-fecha-pasada", dialogo);
  v("F09-I2", "Idoneidad", "Con una fecha pasada, el formulario dice lo mismo que el servidor",
    "formulario: «debe ser futura» · servidor: 400",
    `formulario: ${promete ? "«Puedes guardarla igual»" : avisa ? "«debe ser futura»" : "sin aviso"} · servidor: ${pasada.status}`,
    avisa && !promete && pasada.status === 400, ev);
  await dialogo.getByRole("button", { name: "Cancelar" }).click().catch(() => {});

  // Espera a que la entrevista ocurra y registra cómo salió.
  const espera = new Date(`${hora}:00Z`).getTime() + 5 * 3600_000 - Date.now() + 15_000;
  if (espera > 0) await adminPage.waitForTimeout(espera);
  const cerrar = await llamar("PATCH", `/api/entrevistas/${D.entrevista.id}`, { estado: "Realizada", resultado: "Aprobada" });
  v("F09-O2", "Corrección", "Ya ocurrida, se registra el resultado: Realizada y Aprobada", "Realizada · Aprobada", `${cerrar.datos?.estado} · ${cerrar.datos?.resultado}`);
  await adminPage.goto(`${ERP_URL}/entrevistas`);
  await adminPage.getByRole("button", { name: "Realizadas" }).click().catch(() => {});
  const fila = adminPage.getByText(`Evaluador Funcional ${SELLO}`);
  v("F09-C2", "Completitud", "La entrevista realizada se ve en la agenda", "visible", (await seVe(fila)) ? "visible" : "no", undefined,
    await foto(adminPage, "F09-entrevistas", fila));
});

// ------------------------------------------------------------------ F10 · F11 contratación y seguimiento
test("F10 · contrataciones", async () => {
  const hoy = hoyPeru();
  const r = await llamar("POST", "/api/contrataciones", { postulanteId: D.postulante.id, anuncioId: D.anuncio.id, cargo: `QA Funcional ${SELLO}`,
    fechaIngreso: hoy, tipoContrato: "Plazo fijo", salario: 3500, moneda: "PEN", observaciones: "PRUEBA funcional" });
  D.contratacion = r.datos;
  v("F10-C1", "Completitud", "Se registra la contratación", "201", String(r.status));
  v("F10-O1", "Corrección", "Con ingreso hoy queda «Activo»", "Activo", String(r.datos?.estado));
  const segs = (r.datos?.seguimientos ?? []).map((s: any) => `${s.hitoDias}:${s.fechaProgramada}`).sort();
  v("F10-O2", "Corrección", "Se programan los controles de 30, 60 y 90 días desde el ingreso",
    [30, 60, 90].map((d) => `${d}:${masDias(hoy, d)}`).sort(), segs);
  const proc = await llamar("GET", `/api/procesos?postulanteId=${D.postulante.id}`);
  const estado = (Array.isArray(proc.datos) ? proc.datos : []).find((p: any) => p.anuncioId === D.anuncio.id)?.estadoActual;
  v("F10-O3", "Corrección", "La postulación pasa sola a «Contratado»", "CONTRATADO", String(estado));
  const otra = await llamar("POST", "/api/contrataciones", { postulanteId: D.postulante.id, anuncioId: D.anuncio.id, cargo: `QA Funcional ${SELLO}`,
    fechaIngreso: hoy, tipoContrato: "Plazo fijo", salario: 3500, moneda: "PEN" });
  v("F10-I1", "Idoneidad", "La misma postulación no se contrata dos veces", "409", String(otra.status));
  const anuncio = await llamar("GET", `/api/anuncios/${D.anuncio.id}`);
  v("F10-I2", "Idoneidad", "Al cubrir su única vacante, el anuncio se cierra solo", "Cerrado", String(anuncio.datos?.estado));
  const portal = await (await api.get(`${PORTAL_URL}/api/anuncios`)).json().catch(() => []);
  v("F10-I3", "Idoneidad", "El anuncio cerrado deja de mostrarse en el portal", "no aparece", (portal as any[]).some((a) => a.id === D.anuncio.id) ? "sigue publicado" : "no aparece");
  await adminPage.goto(`${ERP_URL}/contrataciones`);
  await adminPage.waitForLoadState("networkidle");
  v("F10-C2", "Completitud", "La contratación aparece en el módulo Contrataciones", "visible",
    (await seVe(adminPage.getByText(`Funcional ${SELLO}`))) ? "visible" : "no", undefined,
    await foto(adminPage, "F10-contrataciones", adminPage.getByText(`Funcional ${SELLO}`)));
});

test("F11 · seguimiento post-ingreso", async () => {
  const lista = await llamar("GET", `/api/seguimientos?contratacionId=${D.contratacion.id}`);
  const segs = Array.isArray(lista.datos) ? lista.datos : [];
  v("F11-C1", "Completitud", "Los 3 controles se listan en Seguimiento", "3 · Pendiente", `${segs.length} · ${[...new Set(segs.map((s: any) => s.estado))].join("/")}`);
  const primero = segs.find((s: any) => s.hitoDias === 30) ?? segs[0];
  const sinVal = await llamar("PATCH", `/api/seguimientos/${primero?.id}`, { estado: "Realizado" });
  v("F11-O1", "Corrección", "Marcar «Realizado» sin valoración se rechaza", "400", String(sinVal.status));
  const conVal = await llamar("PATCH", `/api/seguimientos/${primero?.id}`, { estado: "Realizado", valoracion: "Satisfactorio", observaciones: "PRUEBA funcional" });
  v("F11-O2", "Corrección", "Con valoración se cierra y guarda la fecha de realización", "Realizado · Satisfactorio · con fecha",
    `${conVal.datos?.estado} · ${conVal.datos?.valoracion} · ${conVal.datos?.fechaRealizada ? "con fecha" : "sin fecha"}`);
  v("F11-I1", "Idoneidad", "Un control realizado ya no cuenta como vencido", "false", String(conVal.datos?.vencido));
  await adminPage.goto(`${ERP_URL}/contrataciones`);
  await adminPage.getByText(`Funcional ${SELLO}`).first().click().catch(() => {});
  await foto(adminPage, "F11-seguimiento", adminPage.getByText(/30 días|Satisfactorio/));
});

test("F12 · dashboard y reportes", async () => {
  const hoy = hoyPeru();
  const r = await llamar("GET", `/api/dashboard?desde=${hoy}&hasta=${hoy}&empresaId=${D.empresa.id}`);
  const res = r.datos?.resumen ?? r.datos;
  D.dashboard = res;
  v("F12-C1", "Completitud", "El dashboard filtra por empresa y fechas", "200", String(r.status));
  v("F12-O1", "Corrección", "Indicadores de la empresa de prueba = lo que se hizo hoy",
    { postulaciones: 2, contratados: 1, evaluaciones: 2, puntajePromedio: 70, porcentajeApto: 50 },
    { postulaciones: res?.postulaciones, contratados: res?.contratados, evaluaciones: res?.evaluaciones, puntajePromedio: res?.puntajePromedio, porcentajeApto: res?.porcentajeApto });
  const embudo = (r.datos?.embudo ?? []).reduce((s: number, e: any) => s + (e.cantidad ?? 0), 0);
  v("F12-I1", "Idoneidad", "El embudo suma lo mismo que las postulaciones", String(res?.postulaciones), String(embudo));
  await adminPage.goto(`${ERP_URL}/dashboard`);
  await adminPage.waitForLoadState("networkidle");
  await adminPage.locator("select").first().selectOption({ value: String(D.empresa.id) }).catch(() => {});
  await adminPage.waitForTimeout(1500);
  const [descarga] = await Promise.all([adminPage.waitForEvent("download", { timeout: 15_000 }).catch(() => null),
    adminPage.getByRole("button", { name: /Exportar CSV/ }).click().catch(() => {})]);
  v("F12-C2", "Completitud", "El reporte se exporta a CSV", ".csv", descarga ? descarga.suggestedFilename().slice(-4) : "sin descarga", undefined,
    await foto(adminPage, "F12-dashboard"));
});

// ------------------------------------------------------------------ limpieza (también verifica reglas)
test("limpieza · cancelar contratación y borrar anuncio y empresa de prueba", async () => {
  const cancelar = await llamar("PATCH", `/api/contrataciones/${D.contratacion.id}`, { estado: "Cancelado", observaciones: "PRUEBA: limpieza" });
  const proc = await llamar("GET", `/api/procesos?postulanteId=${D.postulante.id}`);
  const estado = (Array.isArray(proc.datos) ? proc.datos : []).find((p: any) => p.anuncioId === D.anuncio.id)?.estadoActual;
  v("F10-I4", "Idoneidad", "Cancelar la contratación descarta la postulación (no queda «Contratado» suelto)", "200 · DESCARTADO", `${cancelar.status} · ${estado}`);
  for (const e of [D.entrevistaExtra, D.entrevistaPasada]) if (e) await llamar("PATCH", `/api/entrevistas/${e.id}`, { estado: "Cancelada" });
  const anuncio = await llamar("DELETE", `/api/anuncios/${D.anuncio.id}`);
  const empresa = await llamar("DELETE", `/api/empresas/${D.empresa.id}`);
  const lista = await llamar("GET", "/api/empresas");
  const sigue = (Array.isArray(lista.datos) ? lista.datos : []).some((e: any) => e.id === D.empresa.id);
  v("F03-I2", "Idoneidad", "Sin anuncios, la empresa se borra y deja de listarse", "204 · no listada", `${empresa.status} · ${sigue ? "listada" : "no listada"}`);
  D.limpieza = { contratacion: cancelar.status, anuncio: anuncio.status, empresa: empresa.status };
});

test("resumen · todas las verificaciones se cumplen", async () => {
  const fallidas = VERIFICACIONES.filter((x) => !x.ok).map((x) => `${x.id} ${x.que}: esperado ${x.esperado}, obtenido ${x.obtenido}`);
  expect(fallidas, `${VERIFICACIONES.length} verificaciones`).toEqual([]);
});
