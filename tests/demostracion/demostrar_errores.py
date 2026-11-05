"""Demostración: 5 errores introducidos A PROPÓSITO y cómo las pruebas los detectan.

Para cada error: (1) se introduce en el código, (2) se ejecuta la prueba que debe detectarlo y FALLA,
(3) se restaura el código original (la corrección) y (4) la misma prueba PASA. De cada paso se toma
una captura: código antes, resultado antes, código después, resultado después. El error 5 (portal)
además se captura en el navegador real.

    python tests/demostracion/demostrar_errores.py            # los 5
    python tests/demostracion/demostrar_errores.py 1 3        # solo algunos

SEGURIDAD: el archivo original se guarda byte a byte y se restaura SIEMPRE (try/finally), aunque algo
falle. Nada se despliega. Al terminar se verifica que cada archivo quedó idéntico al original.
Capturas e informe: docs/calidad/demostracion-errores/
"""
import html
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

DEMO = Path(__file__).resolve().parent
RAIZ = DEMO.parents[1]
PRUEBAS = RAIZ / "tests"
SALIDA = RAIZ / "docs" / "calidad" / "demostracion-errores"
NAVEGADORES = PRUEBAS / "compatibilidad" / "navegadores"
PORTAL = RAIZ / "frontend" / "ANUNCIOS"
PUERTO = 3101

sys.path.insert(0, str(PRUEBAS))
from ejecutar import ENTORNO_BASE  # noqa: E402  (mismo entorno de prueba que tests/ejecutar.py)


@dataclass
class Error:
    numero: int
    area: str
    titulo: str
    impacto: str
    archivo: str
    correcto: str
    con_error: str
    prueba: str  # ruta (pytest) o archivo .spec (Playwright)
    filtro: str
    servicio: str | None = None
    ancla: str | None = None  # si `correcto` se repite: se reemplaza la primera aparición después del ancla
    playwright: bool = False
    deteccion: str = ""
    datos: dict = field(default_factory=dict)


ERRORES = [
    Error(
        1, "Interoperabilidad · Meta WhatsApp",
        "Un bloqueo de Meta se muestra como error del usuario",
        "Si Meta bloquea la app (\"API access blocked\", código 200), el ERP responde 400 \"solicitud inválida\": "
        "el usuario cree que hizo algo mal y nadie sabe que hay que revisar la app en Meta.",
        "backend/servicio-comunicaciones/app/infrastructure/whatsapp_client.py",
        "_ERRORES_DE_ACCESO = {10, 200, 368, 131031}",
        "_ERRORES_DE_ACCESO = {10, 368, 131031}",
        "tests/compatibilidad/interoperabilidad/meta_whatsapp/test_cliente_whatsapp.py",
        "200-api-bloqueada or 10-sin-permiso", servicio="servicio-comunicaciones",
        deteccion="El caso 200-api-bloqueada espera 503 \"Meta bloqueó el acceso\" y recibe SolicitudInvalida (400). "
                  "El caso 10-sin-permiso sigue pasando: el error afecta solo al código 200.",
    ),
    Error(
        2, "Interoperabilidad · Amazon SES (correo)",
        "El enlace de invitación se arma sin codificar el correo",
        "Un correo como ana+postula@correo.com llega al portal como \"ana postula@correo.com\" (el \"+\" se "
        "convierte en espacio): el postulante no puede crear su cuenta con el enlace que recibió.",
        "backend/servicio-postulantes/app/infrastructure/correo.py",
        'parametros = urlencode({"invitacion": token_invitacion, "email": email})',
        'parametros = f"invitacion={token_invitacion}&email={email}"',
        "tests/compatibilidad/interoperabilidad/correo_ses/test_correo_ses.py",
        "invitacion_enlaza", servicio="servicio-postulantes",
        deteccion="La prueba lee el enlace del correo como lo haría el navegador y compara el correo: "
                  "obtiene \"ana postula@correo.com\" en vez de \"ana+postula@correo.com\".",
    ),
    Error(
        3, "Co-existencia · Base de datos compartida",
        "Cada servicio puede abrir demasiadas conexiones a la base",
        "Con 20 conexiones extra por servicio, los 5 servicios pueden abrir 115 conexiones y la base RDS "
        "db.t4g.micro admite 112: en un pico, un servicio deja sin conexiones a los demás.",
        "backend/libs/shared/shared_kernel/database.py",
        "CONEXIONES_EXTRA = 2",
        "CONEXIONES_EXTRA = 20",
        "tests/compatibilidad/coexistencia/infraestructura_compartida/test_infraestructura_compartida.py",
        "conexiones",
        deteccion="La prueba suma los pools de los 5 servicios (5 × (3 + 20) = 115) y exige que no pasen del "
                  "50 % del máximo de RDS (56).",
    ),
    Error(
        4, "Co-existencia · Permisos en AWS",
        "El servicio de WhatsApp recibe permisos que no necesita",
        "servicio-comunicaciones queda con el rol de postulantes: puede leer y borrar los CV y DNI de S3 y "
        "enviar correos. Si ese servicio se compromete, expone los documentos de todos los postulantes.",
        "infra/aws/app.yaml",
        '${Proyecto}-rol-sin-permisos',
        '${Proyecto}-rol-postulantes',
        "tests/compatibilidad/coexistencia/infraestructura_compartida/test_infraestructura_compartida.py",
        "solo_postulantes", ancla="TareaComunicaciones:",
        deteccion="La prueba lee la infraestructura como código y exige que solo servicio-postulantes tenga "
                  "permisos de AWS mientras corre (mínimo privilegio).",
    ),
    Error(
        5, "Navegadores · Portal de empleos",
        "El perfil del postulante queda abierto sin iniciar sesión",
        "El middleware protege \"/perfiles\" en vez de \"/perfil\": cualquiera puede abrir la página del perfil "
        "sin iniciar sesión, en cualquier navegador.",
        "frontend/ANUNCIOS/middleware.ts",
        "pathname.startsWith('/perfil') ||",
        "pathname.startsWith('/perfiles') ||",
        "pruebas/portal.spec.ts", "páginas privadas del postulante", playwright=True,
        deteccion="Playwright abre /perfil sin sesión en Chrome y espera que lo lleve a /login?siguiente=...; "
                  "con el error, la página se queda en /perfil.",
    ),
]


# ------------------------------------------------------------------ código: aplicar y restaurar
def _posicion(texto: str, error: Error) -> int:
    inicio = texto.index(error.ancla) if error.ancla else 0
    posicion = texto.find(error.correcto, inicio)
    if posicion < 0:
        raise ValueError(f"No se encontró el código original del error {error.numero} en {error.archivo}")
    if not error.ancla and texto.count(error.correcto) != 1:
        raise ValueError(f"El código del error {error.numero} aparece más de una vez: usa un ancla")
    return posicion


def introducir(error: Error, original: bytes) -> None:
    texto = original.decode("utf-8")
    p = _posicion(texto, error)
    (RAIZ / error.archivo).write_bytes((texto[:p] + error.con_error + texto[p + len(error.correcto):]).encode("utf-8"))


def fragmento(error: Error, cambiado: str, contexto: int = 7) -> dict:
    """Las líneas alrededor del cambio, con su número, tal como están AHORA en el archivo."""
    texto = (RAIZ / error.archivo).read_bytes().decode("utf-8").replace("\r\n", "\n")
    lineas = texto.split("\n")
    ancla = texto.index(error.ancla) if error.ancla else 0
    linea = texto.count("\n", 0, texto.index(cambiado, ancla)) + 1
    desde, hasta = max(1, linea - contexto), min(len(lineas), linea + contexto)
    return {"lineas": [(n, lineas[n - 1]) for n in range(desde, hasta + 1)], "marcada": linea}


# ------------------------------------------------------------------ ejecutar las pruebas
def entorno(servicio: str | None) -> dict:
    env = {k: v for k, v in os.environ.items() if k not in ("AWS_PROFILE", "AWS_DEFAULT_PROFILE")}
    env.update(ENTORNO_BASE)
    rutas = [str(RAIZ / "backend" / "libs" / "shared")]
    if servicio:
        rutas.insert(0, str(RAIZ / "backend" / servicio))
    env["PYTHONPATH"] = os.pathsep.join(rutas)
    env["PYTHONIOENCODING"] = "utf-8"
    return env


def correr_pytest(error: Error) -> dict:
    argumentos = ["-m", "pytest", error.prueba.replace("/", os.sep), "-k", error.filtro, "-v", "--tb=short",
                  "--no-header", "--color=no", "-p", "no:cacheprovider", "--import-mode=importlib",
                  f"--rootdir={PRUEBAS}", "-o", "asyncio_mode=auto", "-o", "asyncio_default_fixture_loop_scope=function"]
    r = subprocess.run([sys.executable, *argumentos], cwd=RAIZ, env=entorno(error.servicio),
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    comando = "python " + " ".join(f'"{a}"' if " " in a else a for a in argumentos)
    return {"comando": comando, "carpeta": str(RAIZ), "salida": (r.stdout + r.stderr).strip(), "codigo": r.returncode}


def correr_playwright(error: Error) -> dict:
    argumentos = ["playwright", "test", error.prueba, "-g", error.filtro, "--project=chrome", "--no-deps",
                  "--retries=0", "--reporter=list", f"--output={SALIDA / '.playwright-temporal'}"]
    env = {k: v for k, v in os.environ.items() if k != "NO_COLOR"}
    env.update({"PORTAL_URL": f"http://localhost:{PUERTO}", "FORCE_COLOR": "0"})
    r = subprocess.run(["npx.cmd" if os.name == "nt" else "npx", *argumentos], cwd=NAVEGADORES, env=env,
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    shutil.rmtree(SALIDA / ".playwright-temporal", ignore_errors=True)  # capturas/videos que Playwright guarda al fallar
    salida = re.sub(r"\x1b\[[0-9;]*[A-Za-z]", "", r.stdout + r.stderr).strip()
    # Fuera los bloques de adjuntos (rutas de capturas, video y traza temporales): no aportan a la explicación.
    limpias, en_adjunto = [], False
    for linea in salida.splitlines():
        texto = linea.strip()
        if texto.startswith(("attachment #", "Error Context:")):
            en_adjunto = True
            continue
        if en_adjunto and (not texto or set(texto) <= {"─"} or ".playwright-temporal" in texto or "chrome" in texto.lower()
                           and "\\" in texto or texto.startswith(("Usage:", "npx playwright show-trace"))):
            continue
        en_adjunto = False
        if "Warning:" in texto or "--trace-warnings" in texto:
            continue
        limpias.append(linea)
    salida = "\n".join(limpias)
    return {"comando": "npx " + " ".join(f'"{a}"' if " " in a else a for a in argumentos), "carpeta": str(NAVEGADORES),
            "salida": salida, "codigo": r.returncode}


# ------------------------------------------------------------------ portal local (error 5)
def _estado(url: str) -> int:
    class SinRedireccion(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None
    try:
        return urllib.request.build_opener(SinRedireccion).open(url, timeout=60).status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:  # noqa: BLE001
        return 0


def esperar_estado(url: str, aceptados: set[int], segundos: int = 240) -> int:
    limite = time.time() + segundos
    while time.time() < limite:
        estado = _estado(url)
        if estado in aceptados:
            return estado
        time.sleep(3)
    raise TimeoutError(f"{url} no respondió {aceptados}")


def capturar_programa(salida: Path, url: str) -> str:
    trabajos = SALIDA / ".trabajos-url.json"
    trabajos.write_text(json.dumps([{"url": url, "salida": str(salida), "html_marco": str(DEMO / "marco_navegador.html")}]), encoding="utf-8")
    r = subprocess.run(["node", str(DEMO / "capturar.cjs"), str(trabajos)], capture_output=True, text=True, encoding="utf-8")
    trabajos.unlink()
    if r.returncode != 0:
        raise RuntimeError(r.stderr)
    return json.loads(r.stdout.strip().splitlines()[-1])[0]["url_final"]


# ------------------------------------------------------------------ dibujar las capturas (HTML)
ESTILO = """
body { margin: 0; background: #e9eef0; font-family: 'Segoe UI', Arial, sans-serif; }
.ventana { display: inline-block; margin: 24px; width: 1300px; border-radius: 10px; overflow: hidden;
  box-shadow: 0 6px 24px rgba(0,0,0,.25); background: #1e1e1e; }
.barra { display: flex; align-items: center; gap: 10px; padding: 10px 16px; background: #2d2d30; color: #cccccc; font-size: 15px; }
.punto { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
.etiqueta { margin-left: auto; padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 14px; color: #fff; }
.mal { background: #d14d36; } .bien { background: #0e8a6b; }
pre { margin: 0; padding: 14px 0; font-family: 'Cascadia Mono', Consolas, 'Courier New', monospace; font-size: 16px; line-height: 1.55; color: #d4d4d4; white-space: pre-wrap; word-break: break-word; }
.l { display: flex; padding: 0 16px 0 0; } .n { width: 64px; text-align: right; padding-right: 18px; color: #858585; flex: none; user-select: none; }
.l.marca-mal { background: rgba(209, 77, 54, .35); } .l.marca-bien { background: rgba(14, 138, 107, .35); }
.c { color: #6a9955; } .s { color: #ce9178; } .k { color: #569cd6; }
.terminal pre { padding: 14px 18px; } .prompt { color: #3a96dd; } .rojo { color: #f14c4c; font-weight: 600; } .verde { color: #23d18b; font-weight: 600; } .gris { color: #9d9d9d; }
.nota { padding: 10px 16px 14px; color: #d4d4d4; font-size: 15px; background: #252526; border-top: 1px solid #3c3c3c; }
"""


def _resaltar(linea: str, extension: str) -> str:
    texto = html.escape(linea, quote=False)
    comentario = "#" if extension in (".py", ".yaml", ".yml") else "//"
    partes = re.split(r"(\"[^\"]*\"|'[^']*')", texto)
    salida, en_comentario = [], False
    for i, parte in enumerate(partes):
        if en_comentario:
            salida.append(parte)
            continue
        if i % 2 == 1:
            salida.append(f'<span class="s">{parte}</span>')
            continue
        if comentario in parte:
            antes, despues = parte.split(comentario, 1)
            salida.append(antes + f'<span class="c">{comentario}{despues}')
            en_comentario = True
            continue
        salida.append(re.sub(r"\b(def|async|await|return|if|raise|import|from|export|function|const|for|in)\b", r'<span class="k">\1</span>', parte))
    return "".join(salida) + ("</span>" if en_comentario else "")


def html_codigo(error: Error, datos: dict, antes: bool) -> str:
    extension = Path(error.archivo).suffix
    clase = "marca-mal" if antes else "marca-bien"
    filas = "".join(
        f'<div class="l {clase if n == datos["marcada"] else ""}"><span class="n">{n}</span><span>{_resaltar(t, extension) or "&nbsp;"}</span></div>'
        for n, t in datos["lineas"])
    etiqueta = ('<span class="etiqueta mal">ANTES · código con el error</span>' if antes
                else '<span class="etiqueta bien">DESPUÉS · código corregido</span>')
    nota = (f"Línea {datos['marcada']}: <b>{html.escape(error.con_error)}</b>" if antes
            else f"Línea {datos['marcada']}: <b>{html.escape(error.correcto)}</b>")
    return (f"<!doctype html><meta charset='utf-8'><style>{ESTILO}</style><div class='ventana'>"
            f"<div class='barra'><span class='punto' style='background:#ff5f56'></span><span class='punto' style='background:#ffbd2e'></span>"
            f"<span class='punto' style='background:#27c93f'></span>&nbsp;{html.escape(error.archivo)}{etiqueta}</div>"
            f"<pre>{filas}</pre><div class='nota'>{nota}</div></div>")


def _colorear_salida(linea: str) -> str:
    texto = html.escape(linea, quote=False)
    if re.search(r"\bFAILED\b|\bfailed\b|^E\s|Error|✘|\b\d+ failed\b|AssertionError", linea):
        return f'<span class="rojo">{texto}</span>'
    if re.search(r"\bPASSED\b|\bpassed\b|✓|\b\d+ passed\b", linea):
        return f'<span class="verde">{texto}</span>'
    if re.search(r"deselected|warning|^-+$|^=+", linea):
        return f'<span class="gris">{texto}</span>'
    return texto


def html_resultado(error: Error, r: dict, antes: bool, maximo: int = 34) -> str:
    lineas = [l for l in r["salida"].splitlines() if l.strip() and "PytestDeprecationWarning" not in l and "asyncio_default" not in l]
    if len(lineas) > maximo:
        lineas = lineas[:maximo - 6] + ["   …"] + lineas[-5:]
    cuerpo = "\n".join(_colorear_salida(l) for l in lineas)
    etiqueta = ('<span class="etiqueta mal">ANTES · la prueba detecta el error</span>' if antes
                else '<span class="etiqueta bien">DESPUÉS · la prueba pasa</span>')
    resumen = "Resultado: FALLA (código de salida %d)" % r["codigo"] if r["codigo"] else "Resultado: PASA (código de salida 0)"
    return (f"<!doctype html><meta charset='utf-8'><style>{ESTILO}</style><div class='ventana terminal'>"
            f"<div class='barra'>PowerShell · Terminal{etiqueta}</div>"
            f"<pre><span class='prompt'>PS {html.escape(r['carpeta'])}&gt;</span> {html.escape(r['comando'])}\n\n{cuerpo}</pre>"
            f"<div class='nota'>{resumen} · {datetime.now():%d/%m/%Y %H:%M}</div></div>")


# ------------------------------------------------------------------ versión compacta (para diapositivas)
# Misma ejecución, menos texto: 3 líneas de código alrededor del cambio y solo las líneas clave de la
# prueba, en una ventana más angosta con letra más grande, para que se lea al proyectarla.
ESTILO_COMPACTO = "<style>.ventana{width:1100px} pre{font-size:18px} .barra,.nota{font-size:16px}</style>"


def html_codigo_compacto(error: Error, datos: dict, antes: bool) -> str:
    cerca = {**datos, "lineas": [(n, t) for n, t in datos["lineas"] if abs(n - datos["marcada"]) <= 3]}
    return html_codigo(error, cerca, antes).replace("</style>", "</style>" + ESTILO_COMPACTO, 1)


def _lineas_clave(salida: str) -> list[str]:
    clave, lineas_e, en_diff = [], 0, False
    for linea in salida.splitlines():
        texto = linea.strip()
        if not texto:
            continue
        if "::" in linea and re.search(r"\b(PASSED|FAILED) \[", linea):  # resultado de cada prueba (pytest -v)
            estado = "FAILED" if "FAILED" in linea else "PASSED"
            clave.append(f"{estado}  {re.sub(r' (PASSED|FAILED) \[.*$', '', linea.split('::')[-1])}")
        elif re.match(r"^E(\s|$)", texto):  # detalle de la aserción (pytest marca esas líneas con "E ")
            cuerpo = texto[1:].strip()
            if "Full diff" in cuerpo:
                en_diff = True
            if en_diff or not cuerpo or lineas_e >= 4 or any(r in cuerpo for r in ("Omitting", "use -vv", "truncated", "{...")):
                continue
            clave.append(f"E   {cuerpo}")
            lineas_e += 1
        elif texto.startswith("assert "):
            clave.append(f"    {texto}")
        elif re.match(r"^=+ .*\b(passed|failed)\b.* =+$", texto):
            clave.append(texto)
        elif re.search(r"^(ok|x|✓|✘)\s+\d+ \[chrome\]", texto):  # Playwright: resultado de la prueba
            clave.append(texto)
        elif texto.startswith(("Error:", "Expected", "Received")) or re.match(r"^\d+ (passed|failed)", texto):
            clave.append(texto)
    return clave


def html_resultado_compacto(error: Error, r: dict, antes: bool) -> str:
    if error.playwright:
        comando = f'npx playwright test {error.prueba} -g "{error.filtro}" --project=chrome'
    else:
        comando = f'python -m pytest {Path(error.prueba).name} -k "{error.filtro}" -v'
    resumido = {**r, "comando": comando, "salida": "\n".join(_lineas_clave(r["salida"]))}
    html_r = html_resultado(error, resumido, antes).replace("</style>", "</style>" + ESTILO_COMPACTO, 1)
    numero = "2-resultado-antes" if antes else "4-resultado-despues"
    return html_r.replace("<div class='nota'>", f"<div class='nota'>Salida resumida (líneas clave); completa en error{error.numero}-{numero}.png · ", 1)


# ------------------------------------------------------------------ demostración
def demostrar(error: Error) -> dict:
    ruta = RAIZ / error.archivo
    original = ruta.read_bytes()
    prefijo = SALIDA / f"error{error.numero}"
    servidor = None
    resultado = {"numero": error.numero}
    try:
        print(f"\n=== Error {error.numero}: {error.titulo}")
        introducir(error, original)
        resultado["codigo_antes"] = fragmento(error, error.con_error)
        if error.playwright:
            servidor = subprocess.Popen(
                ["npx.cmd" if os.name == "nt" else "npx", "next", "dev", "-p", str(PUERTO)], cwd=PORTAL,
                env={**os.environ, "GATEWAY_INTERNAL_URL": "http://127.0.0.1:9/api/v1", "NEXT_TELEMETRY_DISABLED": "1"},
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            esperar_estado(f"http://localhost:{PUERTO}/login", {200})
            esperar_estado(f"http://localhost:{PUERTO}/perfil", {200})  # con el error: entra sin sesión
            resultado["url_antes"] = capturar_programa(Path(f"{prefijo}-5-programa-antes.png"), f"http://localhost:{PUERTO}/perfil")
            resultado["prueba_antes"] = correr_playwright(error)
        else:
            resultado["prueba_antes"] = correr_pytest(error)
        print(f"  con el error: código de salida {resultado['prueba_antes']['codigo']}")
    finally:
        ruta.write_bytes(original)  # la corrección: el código original, byte a byte
    try:
        resultado["codigo_despues"] = fragmento(error, error.correcto)
        if error.playwright:
            esperar_estado(f"http://localhost:{PUERTO}/perfil", {302, 307, 308}, 120)  # el servidor recompiló
            resultado["url_despues"] = capturar_programa(Path(f"{prefijo}-6-programa-despues.png"), f"http://localhost:{PUERTO}/perfil")
            resultado["prueba_despues"] = correr_playwright(error)
        else:
            resultado["prueba_despues"] = correr_pytest(error)
        print(f"  corregido:    código de salida {resultado['prueba_despues']['codigo']}")
    finally:
        if servidor:
            subprocess.run(["taskkill", "/PID", str(servidor.pid), "/T", "/F"], capture_output=True) if os.name == "nt" else servidor.kill()
    if ruta.read_bytes() != original:
        raise RuntimeError(f"{error.archivo} no quedó idéntico al original")
    resultado["restaurado"] = True
    return resultado


def main(argumentos: list[str]) -> int:
    elegidos = [e for e in ERRORES if not argumentos or str(e.numero) in argumentos]
    SALIDA.mkdir(parents=True, exist_ok=True)
    trabajos, informe = [], []
    for error in elegidos:
        r = demostrar(error)
        prefijo = SALIDA / f"error{error.numero}"
        piezas = [
            ("1-codigo-antes", html_codigo(error, r["codigo_antes"], True)),
            ("2-resultado-antes", html_resultado(error, r["prueba_antes"], True)),
            ("3-codigo-despues", html_codigo(error, r["codigo_despues"], False)),
            ("4-resultado-despues", html_resultado(error, r["prueba_despues"], False)),
            ("p1-codigo-antes", html_codigo_compacto(error, r["codigo_antes"], True)),
            ("p2-resultado-antes", html_resultado_compacto(error, r["prueba_antes"], True)),
            ("p3-codigo-despues", html_codigo_compacto(error, r["codigo_despues"], False)),
            ("p4-resultado-despues", html_resultado_compacto(error, r["prueba_despues"], False)),
        ]
        for nombre, contenido in piezas:
            pagina = Path(f"{prefijo}-{nombre}.html")
            pagina.write_text(contenido, encoding="utf-8")
            trabajos.append({"html": str(pagina), "salida": str(pagina.with_suffix(".png"))})
        informe.append({
            "numero": error.numero, "area": error.area, "titulo": error.titulo, "impacto": error.impacto,
            "archivo": error.archivo, "con_error": error.con_error, "correcto": error.correcto,
            "deteccion": error.deteccion, "linea": r["codigo_antes"]["marcada"],
            "falla_antes": r["prueba_antes"]["codigo"] != 0, "pasa_despues": r["prueba_despues"]["codigo"] == 0,
            "comando": r["prueba_antes"]["comando"], "url_antes": r.get("url_antes"), "url_despues": r.get("url_despues"),
        })
    lista = SALIDA / ".trabajos.json"
    lista.write_text(json.dumps(trabajos), encoding="utf-8")
    subprocess.run(["node", str(DEMO / "capturar.cjs"), str(lista)], check=True, capture_output=True)
    lista.unlink()
    for t in trabajos:
        Path(t["html"]).unlink()
    anterior = SALIDA / "resultados.json"
    previos = {d["numero"]: d for d in json.loads(anterior.read_text(encoding="utf-8"))} if anterior.exists() else {}
    previos.update({d["numero"]: d for d in informe})
    anterior.write_text(json.dumps([previos[k] for k in sorted(previos)], ensure_ascii=False, indent=2), encoding="utf-8")
    ok = all(d["falla_antes"] and d["pasa_despues"] for d in informe)
    print("\n" + "\n".join(f"Error {d['numero']}: antes {'FALLA ✓' if d['falla_antes'] else 'NO FALLA ✗'} · "
                            f"después {'PASA ✓' if d['pasa_despues'] else 'FALLA ✗'}" for d in informe))
    print(f"Capturas en {SALIDA}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
