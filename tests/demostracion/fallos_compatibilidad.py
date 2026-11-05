"""Compatibilidad (ISO/IEC 25010): 8 fallos inyectados A PROPÓSITO y cómo las pruebas existentes los detectan.

Mismo método que la presentación de pruebas funcionales: para cada fallo se toman 6 capturas.
    1 · la prueba pasa con el código original      2 · el código original
    3 · el código con el fallo inyectado           4 · la prueba lo detecta (roja)
    5 · el código corregido (se restaura)          6 · la prueba vuelve a pasar

    python tests/demostracion/fallos_compatibilidad.py          # los 8
    python tests/demostracion/fallos_compatibilidad.py 2 5      # solo algunos

SEGURIDAD: cada archivo se guarda byte a byte y se restaura SIEMPRE (try/finally). Nada se despliega a AWS.
Al terminar se comprueba con SHA-256 que cada archivo quedó idéntico al original.
Capturas: docs/calidad/fallos-compatibilidad/
"""
import hashlib
import json
import os
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

DEMO = Path(__file__).resolve().parent
RAIZ = DEMO.parents[1]
PRUEBAS = RAIZ / "tests"
SALIDA = RAIZ / "docs" / "calidad" / "fallos-compatibilidad"
INTEROP = "tests/compatibilidad/interoperabilidad"
COEX = "tests/compatibilidad/coexistencia"

sys.path.insert(0, str(DEMO))
import demostrar_errores as base  # noqa: E402  (reutiliza: introducir, fragmento, entorno y el dibujo de capturas)

_lineas_clave_original = base._lineas_clave


def _lineas_clave_cortas(salida: str) -> list[str]:
    """Para la diapositiva: líneas de máximo 115 caracteres y a lo sumo 9 líneas + el resumen final."""
    lineas = [l if len(l) <= 115 else l[:114] + "…" for l in _lineas_clave_original(salida)]
    return lineas if len(lineas) <= 10 else lineas[:9] + lineas[-1:]


base._lineas_clave = _lineas_clave_cortas


@dataclass
class Fallo:
    numero: int
    sub: str  # Interoperabilidad | Co-existencia
    area: str
    titulo: str
    regla: str
    impacto: str
    archivo: str
    correcto: str
    con_error: str
    prueba: str
    filtro: str
    servicio: str | None = None
    ancla: str | None = None
    entorno: dict = field(default_factory=dict)
    # Lo que se muestra en la diapositiva (una línea, legible)
    antes_corto: str = ""
    ahora_corto: str = ""


FALLOS = [
    Fallo(
        1, "Interoperabilidad", "Meta WhatsApp · envío de plantillas",
        "El idioma de la plantilla no sigue el formato de Meta",
        "La Cloud API exige el idioma de la plantilla como objeto: \"language\": {\"code\": \"es\"}.",
        "Meta rechazaría todas las plantillas (error 100, parámetro inválido): no saldría ninguna invitación ni aviso de entrevista por WhatsApp.",
        "backend/servicio-comunicaciones/app/infrastructure/whatsapp_client.py",
        'template: dict[str, Any] = {"name": plantilla, "language": {"code": idioma}}',
        'template: dict[str, Any] = {"name": plantilla, "language": idioma}',
        f"{INTEROP}/meta_whatsapp/test_cliente_whatsapp.py", "plantilla_con_variables or plantilla_sin_variables",
        "servicio-comunicaciones",
        antes_corto='"language": {"code": idioma}',
        ahora_corto='"language": idioma',
    ),
    Fallo(
        2, "Interoperabilidad", "Meta WhatsApp · estados",
        "El estado «leído» retrocede a «entregado»",
        "Meta puede enviar los estados desordenados: un mensaje leído nunca vuelve a «entregado».",
        "Las palomitas azules del chat desaparecerían y el ERP mostraría como no leído un mensaje que el postulante ya leyó.",
        "backend/servicio-comunicaciones/app/api/v1/webhook.py",
        '_ORDEN = {"enviado": 1, "entregado": 2, "leido": 3}',
        '_ORDEN = {"enviado": 1, "entregado": 3, "leido": 2}',
        f"{INTEROP}/meta_whatsapp/test_webhook_formatos_meta.py", "estados_avanzan", "servicio-comunicaciones",
        antes_corto='"entregado": 2, "leido": 3',
        ahora_corto='"entregado": 3, "leido": 2',
    ),
    Fallo(
        3, "Interoperabilidad", "Amazon S3 · documentos",
        "Los documentos se guardan sin su tipo MIME",
        "Cada CV o DNI se guarda en S3 con su tipo (PDF, JPG, PNG) para descargarlo y abrirlo bien.",
        "Al descargar un CV, el navegador recibiría «application/octet-stream»: no lo abre como PDF ni muestra la imagen del DNI.",
        "backend/servicio-postulantes/app/infrastructure/storage.py",
        "            ContentType=tipo_de_archivo,",
        '            ContentType="application/octet-stream",',
        f"{INTEROP}/almacenamiento_s3/test_almacenamiento_s3.py", "tipo_mime or descargar_devuelve", "servicio-postulantes",
        antes_corto="ContentType=tipo_de_archivo",
        ahora_corto='ContentType="application/octet-stream"',
    ),
    Fallo(
        4, "Interoperabilidad", "Contrato de API · ERP ↔ servicio",
        "El servicio cambia PATCH por PUT sin avisar al ERP",
        "Las rutas del servicio no cambian sin aprobar el contrato OpenAPI que usan el ERP y el portal.",
        "El ERP sigue llamando PATCH /anuncios/{id}/estado: recibiría 405 y nadie podría cerrar ni reabrir un anuncio.",
        "backend/servicio-empresas-vacantes/app/api/v1/anuncios.py",
        '@router.patch("/{anuncio_id}/estado"',
        '@router.put("/{anuncio_id}/estado"',
        f"{INTEROP}/contratos_api/test_contrato_servicio.py", "no_cambio_sin_aprobacion", "servicio-empresas-vacantes",
        entorno={"CONTRATO_SERVICIO": "servicio-empresas-vacantes"},
        antes_corto='@router.patch("/{anuncio_id}/estado")',
        ahora_corto='@router.put("/{anuncio_id}/estado")',
    ),
    Fallo(
        5, "Co-existencia", "Sesiones ERP / portal · Gateway",
        "Un token sin audiencia entra al ERP",
        "El ERP y el portal comparten el Gateway: solo un token con audiencia «erp» abre el ERP.",
        "Un token emitido por otro sistema o sin «aud» (p. ej. uno antiguo) abriría el ERP: se rompe la separación entre las dos apps.",
        "backend/gateway/app/api/deps.py",
        'if payload.get("aud") != "erp" or payload.get("rol") not in ROLES_INTERNOS_ERP:',
        'if payload.get("aud") not in ("erp", None) or payload.get("rol") not in ROLES_INTERNOS_ERP:',
        f"{COEX}/sesiones_erp_portal/test_sesiones_separadas.py", "sin_audiencia", "gateway",
        antes_corto='payload.get("aud") != "erp"',
        ahora_corto='payload.get("aud") not in ("erp", None)',
    ),
    Fallo(
        6, "Co-existencia", "Red · balanceador",
        "El balanceador queda abierto a todo internet",
        "El balanceador solo acepta tráfico de CloudFront (lista de prefijos administrada por AWS).",
        "Cualquiera podría llamar al balanceador directamente, saltándose CloudFront (HTTPS, caché y protección), y saturar a los 7 servicios.",
        "infra/aws/app.yaml",
        "SourcePrefixListId: !Ref ListaPrefijosCloudFront }",
        "CidrIp: 0.0.0.0/0 }",
        f"{COEX}/infraestructura_compartida/test_infraestructura_compartida.py", "balanceador_solo_acepta",
        ancla="SgBalanceador:",
        antes_corto="SourcePrefixListId: !Ref ListaPrefijosCloudFront",
        ahora_corto="CidrIp: 0.0.0.0/0",
    ),
    Fallo(
        7, "Co-existencia", "Logs · CloudWatch",
        "WhatsApp escribe en el log de otro servicio",
        "Cada servicio tiene su propio grupo de logs y su propio puerto.",
        "Los errores de WhatsApp se mezclarían con los de procesos de selección: la alarma de WhatsApp no los vería y diagnosticar un fallo sería muy difícil.",
        "infra/aws/app.yaml",
        'awslogs-group: !Sub "/${Proyecto}/servicio-comunicaciones"',
        'awslogs-group: !Sub "/${Proyecto}/servicio-procesos-seleccion"',
        f"{COEX}/infraestructura_compartida/test_infraestructura_compartida.py", "comparte_puerto_ni_log",
        ancla="TareaComunicaciones:",
        antes_corto="/${Proyecto}/servicio-comunicaciones",
        ahora_corto="/${Proyecto}/servicio-procesos-seleccion",
    ),
    Fallo(
        8, "Co-existencia", "Base de datos compartida",
        "Dos servicios comparten el mismo esquema",
        "Los 5 servicios comparten una base RDS, pero cada uno usa su propio esquema.",
        "WhatsApp crearía sus tablas dentro del esquema de procesos de selección: un cambio en uno puede borrar o bloquear datos del otro.",
        "infra/aws/app.yaml",
        "- { Name: DB_SCHEMA, Value: comunicaciones }",
        "- { Name: DB_SCHEMA, Value: procesos_seleccion }",
        f"{COEX}/infraestructura_compartida/test_infraestructura_compartida.py", "propio_esquema",
        ancla="TareaComunicaciones:",
        antes_corto="DB_SCHEMA = comunicaciones",
        ahora_corto="DB_SCHEMA = procesos_seleccion",
    ),
]


def correr(f: Fallo) -> dict:
    argumentos = ["-m", "pytest", f.prueba.replace("/", os.sep), "-k", f.filtro, "-v", "--tb=short",
                  "--no-header", "--color=no", "-p", "no:cacheprovider", "--import-mode=importlib",
                  f"--rootdir={PRUEBAS}", "-o", "asyncio_mode=auto", "-o", "asyncio_default_fixture_loop_scope=function"]
    env = base.entorno(f.servicio)
    env.update(f.entorno)
    r = subprocess.run([sys.executable, *argumentos], cwd=RAIZ, env=env,
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    comando = "python " + " ".join(f'"{a}"' if " " in a else a for a in argumentos)
    return {"comando": comando, "carpeta": str(RAIZ), "salida": (r.stdout + r.stderr).strip(), "codigo": r.returncode}


def _como_error(f: Fallo) -> base.Error:
    # En Windows git puede dejar los archivos con CRLF: el fragmento de varias líneas debe usar el mismo salto.
    crlf = b"\r\n" in (RAIZ / f.archivo).read_bytes()
    ajustar = (lambda s: s.replace("\n", "\r\n")) if crlf else (lambda s: s)
    return base.Error(f.numero, f.area, f.titulo, f.impacto, f.archivo, ajustar(f.correcto), ajustar(f.con_error),
                      f.prueba, f.filtro, f.servicio, f.ancla)


def _etiquetar(html: str, texto: str, clase: str) -> str:
    """Cambia la etiqueta de la barra de la ventana (ANTES / DESPUÉS) por la del paso."""
    import re
    return re.sub(r"<span class=\"etiqueta (mal|bien)\">[^<]*</span>", f'<span class="etiqueta {clase}">{texto}</span>', html, 1)


def _sin_nota_compacta(html: str) -> str:
    import re
    return re.sub(r"Salida resumida \(líneas clave\); completa en [^·]*· ", "Salida resumida (líneas clave) · ", html)


def demostrar(f: Fallo) -> dict:
    ruta = RAIZ / f.archivo
    original = ruta.read_bytes()
    huella = hashlib.sha256(original).hexdigest()
    e = _como_error(f)
    r = {"numero": f.numero}
    print(f"\n=== Fallo {f.numero}: {f.titulo}")
    r["prueba_inicial"] = correr(f)
    r["codigo_original"] = base.fragmento(e, f.correcto.splitlines()[0])
    print(f"  original:  código de salida {r['prueba_inicial']['codigo']}")
    try:
        base.introducir(e, original)
        r["codigo_error"] = base.fragmento(e, f.con_error.splitlines()[0])
        r["prueba_error"] = correr(f)
        print(f"  con fallo: código de salida {r['prueba_error']['codigo']}")
    finally:
        ruta.write_bytes(original)  # la corrección: el código original, byte a byte
    r["codigo_corregido"] = base.fragmento(e, f.correcto.splitlines()[0])
    r["prueba_final"] = correr(f)
    print(f"  corregido: código de salida {r['prueba_final']['codigo']}")
    if hashlib.sha256(ruta.read_bytes()).hexdigest() != huella:
        raise RuntimeError(f"{f.archivo} no quedó idéntico al original")
    return r


def piezas(f: Fallo, r: dict) -> list[tuple[str, str]]:
    e = _como_error(f)
    cod = base.html_codigo_compacto
    res = lambda datos, antes: _sin_nota_compacta(base.html_resultado_compacto(e, datos, antes))  # noqa: E731
    # El fragmento de código original/corregido marca la línea con el código correcto (verde).
    return [
        ("1-verde-inicial", _etiquetar(res(r["prueba_inicial"], False), "CAPTURA 1 · la prueba pasa con el código original", "bien")),
        ("2-codigo-original", _etiquetar(cod(e, r["codigo_original"], False), "CAPTURA 2 · código original", "bien")
            .replace(f"Línea {r['codigo_original']['marcada']}:", f"Línea {r['codigo_original']['marcada']} (correcta):")),
        ("3-codigo-con-error", _etiquetar(cod(e, r["codigo_error"], True), "CAPTURA 3 · código con el fallo inyectado", "mal")),
        ("4-prueba-roja", _etiquetar(res(r["prueba_error"], True), "CAPTURA 4 · la prueba detecta el fallo", "mal")),
        ("5-codigo-corregido", _etiquetar(cod(e, r["codigo_corregido"], False), "CAPTURA 5 · código corregido", "bien")),
        ("6-prueba-verde", _etiquetar(res(r["prueba_final"], False), "CAPTURA 6 · la prueba vuelve a pasar", "bien")),
    ]


def _resumen_pytest(salida: str) -> str:
    import re
    m = re.findall(r"=+ (.*?(?:passed|failed).*?) =+", salida)
    return m[-1] if m else ""


def main(argumentos: list[str]) -> int:
    elegidos = [f for f in FALLOS if not argumentos or str(f.numero) in argumentos]
    SALIDA.mkdir(parents=True, exist_ok=True)
    trabajos, informe = [], []
    for f in elegidos:
        r = demostrar(f)
        for nombre, contenido in piezas(f, r):
            pagina = SALIDA / f"fallo{f.numero}-{nombre}.html"
            pagina.write_text(contenido, encoding="utf-8")
            trabajos.append({"html": str(pagina), "salida": str(pagina.with_suffix(".png"))})
        informe.append({
            "numero": f.numero, "subcaracteristica": f.sub, "area": f.area, "titulo": f.titulo, "regla": f.regla,
            "impacto": f.impacto, "archivo": f.archivo, "linea": r["codigo_error"]["marcada"],
            "antes": f.antes_corto, "ahora": f.ahora_corto, "prueba": Path(f.prueba).name, "filtro": f.filtro,
            "inicial": _resumen_pytest(r["prueba_inicial"]["salida"]), "con_fallo": _resumen_pytest(r["prueba_error"]["salida"]),
            "final": _resumen_pytest(r["prueba_final"]["salida"]),
            "pasa_inicial": r["prueba_inicial"]["codigo"] == 0, "falla_con_error": r["prueba_error"]["codigo"] != 0,
            "pasa_final": r["prueba_final"]["codigo"] == 0, "salida_error": r["prueba_error"]["salida"][-3000:],
        })
    lista = SALIDA / ".trabajos.json"
    lista.write_text(json.dumps(trabajos), encoding="utf-8")
    subprocess.run(["node", str(DEMO / "capturar.cjs"), str(lista)], check=True, capture_output=True)
    lista.unlink()
    for t in trabajos:
        Path(t["html"]).unlink()
    archivo = SALIDA / "resultados.json"
    previos = {d["numero"]: d for d in json.loads(archivo.read_text(encoding="utf-8"))} if archivo.exists() else {}
    previos.update({d["numero"]: d for d in informe})
    archivo.write_text(json.dumps([previos[k] for k in sorted(previos)], ensure_ascii=False, indent=2), encoding="utf-8")
    ok = all(d["pasa_inicial"] and d["falla_con_error"] and d["pasa_final"] for d in informe)
    for d in informe:
        print(f"Fallo {d['numero']}: inicial {d['inicial']} · con fallo {d['con_fallo']} · corregido {d['final']}")
    print(f"Capturas en {SALIDA}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
