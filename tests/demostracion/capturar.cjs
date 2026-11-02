// Toma las capturas de la demostración de errores con el Chromium de Playwright.
//   node capturar.cjs trabajos.json
// Cada trabajo: { "html": "<archivo .html>", "salida": "<png>" }  → captura de la ventana dibujada
//           o:  { "url": "http://...", "salida": "<png>", "html_marco": "<plantilla>" } → página real
//               dentro de un marco de navegador que muestra la dirección final (se ven las redirecciones).
const fs = require("fs");
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "compatibilidad", "navegadores", "node_modules", "@playwright", "test"));

(async () => {
  const trabajos = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const navegador = await chromium.launch();
  const resultados = [];
  for (const t of trabajos) {
    if (t.url) {
      const pagina = await navegador.newPage({ viewport: { width: 1280, height: 760 } });
      await pagina.goto(t.url, { waitUntil: "load" });
      await pagina.waitForTimeout(3000); // que la página termine de dibujarse (en desarrollo hay recarga en caliente)
      const imagen = (await pagina.screenshot()).toString("base64");
      const final = pagina.url();
      await pagina.close();
      const marco = fs.readFileSync(t.html_marco, "utf8").replace("{{URL}}", final).replace("{{IMAGEN}}", imagen);
      const temporal = t.salida.replace(/\.png$/, ".html");
      fs.writeFileSync(temporal, marco, "utf8");
      t.html = temporal;
      resultados.push({ salida: t.salida, url_final: final });
    }
    const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
    await pagina.goto("file:///" + path.resolve(t.html).replace(/\\/g, "/"));
    await pagina.locator(".ventana").screenshot({ path: t.salida });
    await pagina.close();
    if (t.url) fs.unlinkSync(t.html);
  }
  await navegador.close();
  console.log(JSON.stringify(resultados));
})().catch((e) => { console.error(e); process.exit(1); });
