"""Sprint 2 — pruebas de compatibilidad contra el entorno REAL en AWS (la app debe estar prendida).

    python tests/compatibilidad/entorno_real/sprint2.py                # perfil "desarrollo"
    python tests/compatibilidad/entorno_real/sprint2.py --casos A2,A3,B2  # sin apagar WhatsApp

Casos:
  A2  Contrato real con la Graph API de Meta (solo lectura): número, plantillas, formato de error.
  A3  Webhook real de punta a punta (CloudFront → balanceador → Gateway → comunicaciones), firmado como
      lo firma Meta. Usa un estado de un mensaje INEXISTENTE: no crea ni cambia datos.
  B2  Simulador de buzones de Amazon SES (entrega, rebote, queja, supresión) con el remitente real.
  E3  Aislamiento de fallos: apaga servicio-comunicaciones, comprueba que el resto del sistema sigue
      funcionando y lo vuelve a encender (siempre, aunque algo falle).

Los secretos se leen de SSM en memoria y nunca se imprimen. El reporte queda en
tests/evidencias/sprint2-<casos>.md.
"""
import argparse
import hashlib
import hmac
import json
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import boto3
import httpx

RAIZ = Path(__file__).resolve().parents[3]
EVIDENCIAS = RAIZ / "tests" / "evidencias"
PROYECTO = "talenterp"
CAMPOS_PLANTILLA = "name,status,category,language,components,rejected_reason"  # los que pide whatsapp_client.py
resultados: list[tuple[str, str, bool, str]] = []


def comprobar(caso: str, descripcion: str, ok: bool, detalle: str = "") -> bool:
    resultados.append((caso, descripcion, bool(ok), detalle))
    print(f"  [{'OK' if ok else 'FALLA'}] {caso} · {descripcion}" + (f" — {detalle}" if detalle else ""), flush=True)
    return bool(ok)


def config_env() -> dict:
    datos = {}
    for linea in (RAIZ / "infra" / "aws" / "config.env").read_text(encoding="utf-8").splitlines():
        if "=" in linea and not linea.lstrip().startswith("#"):
            clave, valor = linea.split("=", 1)
            datos[clave.strip()] = valor.strip()
    return datos


# ------------------------------------------------------------------------------------------- A2
def caso_a2(ssm) -> None:
    print("\n== A2 · Contrato real con la Graph API de Meta (solo lectura)")
    p = lambda n, cifrado=True: ssm.get_parameter(Name=f"/{PROYECTO}/meta/{n}", WithDecryption=cifrado)["Parameter"]["Value"]
    token, telefono, waba = p("access-token"), p("phone-number-id", False), p("waba-id", False)
    graph = "https://graph.facebook.com/v23.0"
    cabeceras = {"Authorization": f"Bearer {token}"}
    with httpx.Client(timeout=20) as cliente:
        r = cliente.get(f"{graph}/{telefono}", params={"fields": "display_phone_number,verified_name,quality_rating"}, headers=cabeceras)
        datos = r.json()
        comprobar("A2", "El número de WhatsApp responde con sus datos", r.status_code == 200 and "display_phone_number" in datos,
                  f"HTTP {r.status_code}, calidad {datos.get('quality_rating', '?')}")

        r = cliente.get(f"{graph}/{waba}/message_templates", params={"fields": CAMPOS_PLANTILLA, "limit": 100}, headers=cabeceras)
        plantillas = r.json().get("data", []) if r.status_code == 200 else []
        campos_ok = all({"name", "status", "category", "language"} <= set(t) for t in plantillas)
        comprobar("A2", "Las plantillas traen los campos que usa el ERP", r.status_code == 200 and campos_ok,
                  f"HTTP {r.status_code}, {len(plantillas)} plantillas, aprobadas: {sum(t.get('status') == 'APPROVED' for t in plantillas)}")

        r = cliente.get(f"{graph}/{waba}/phone_numbers", headers=cabeceras)
        ids = [n.get("id") for n in r.json().get("data", [])] if r.status_code == 200 else []
        comprobar("A2", "El número configurado pertenece a la cuenta WABA configurada", telefono in ids, f"HTTP {r.status_code}")

        r = cliente.get(f"{graph}/me", headers={"Authorization": "Bearer token-invalido-de-prueba"})
        error = r.json().get("error", {}) if r.headers.get("content-type", "").startswith("application/json") else {}
        comprobar("A2", "Un token inválido devuelve el formato de error que interpreta el ERP",
                  r.status_code in (400, 401) and isinstance(error.get("code"), int) and "message" in error,
                  f"HTTP {r.status_code}, code {error.get('code')}")


# ------------------------------------------------------------------------------------------- A3
def caso_a3(ssm, url_erp: str) -> None:
    print("\n== A3 · Webhook real de punta a punta")
    secreto = ssm.get_parameter(Name=f"/{PROYECTO}/meta/app-secret", WithDecryption=True)["Parameter"]["Value"]
    verificacion = ssm.get_parameter(Name=f"/{PROYECTO}/meta/verify-token", WithDecryption=True)["Parameter"]["Value"]
    url = f"{url_erp}/api/v1/publico/webhook/whatsapp"
    carga = {"object": "whatsapp_business_account", "entry": [{"id": "0", "changes": [{"field": "messages", "value": {
        "messaging_product": "whatsapp", "metadata": {"display_phone_number": "0", "phone_number_id": "0"},
        "statuses": [{"id": f"wamid.PRUEBA-COMPATIBILIDAD-{int(time.time())}", "status": "delivered",
                      "timestamp": str(int(time.time())), "recipient_id": "51900000000"}]}}]}]}
    cuerpo = json.dumps(carga).encode()
    firma = "sha256=" + hmac.new(secreto.encode(), cuerpo, hashlib.sha256).hexdigest()
    with httpx.Client(timeout=20) as cliente:
        r = cliente.get(url, params={"hub.mode": "subscribe", "hub.verify_token": verificacion, "hub.challenge": "4242"})
        comprobar("A3", "Meta puede verificar el webhook (devuelve el challenge)", r.status_code == 200 and r.text == "4242", f"HTTP {r.status_code}")
        r = cliente.get(url, params={"hub.mode": "subscribe", "hub.verify_token": "adivinado", "hub.challenge": "1"})
        comprobar("A3", "Un token de verificación falso se rechaza", r.status_code == 403, f"HTTP {r.status_code}")
        r = cliente.post(url, content=cuerpo, headers={"Content-Type": "application/json", "X-Hub-Signature-256": firma})
        comprobar("A3", "Una notificación firmada como Meta se acepta (200)", r.status_code == 200 and r.json().get("ok") is True,
                  f"HTTP {r.status_code}, {r.text[:80]}")
        r = cliente.post(url, content=cuerpo, headers={"Content-Type": "application/json"})
        comprobar("A3", "Sin firma se rechaza (nadie puede inyectar mensajes falsos)", r.status_code == 401, f"HTTP {r.status_code}")
        otra = "sha256=" + hmac.new(b"otra-clave", cuerpo, hashlib.sha256).hexdigest()
        r = cliente.post(url, content=cuerpo, headers={"Content-Type": "application/json", "X-Hub-Signature-256": otra})
        comprobar("A3", "Firmada con otra clave se rechaza", r.status_code == 401, f"HTTP {r.status_code}")


# ------------------------------------------------------------------------------------------- B2
SIMULADOR = {
    "success@simulator.amazonses.com": "entrega",
    "bounce@simulator.amazonses.com": "rebote",
    "complaint@simulator.amazonses.com": "queja",
    "suppressionlist@simulator.amazonses.com": "lista de supresión",
}


def caso_b2(sesion, remitente: str) -> datetime:
    print("\n== B2 · Simulador de buzones de Amazon SES")
    ses = sesion.client("sesv2")
    identidad = ses.get_email_identity(EmailIdentity=remitente)
    comprobar("B2", "El remitente está verificado en SES", identidad.get("VerifiedForSendingStatus") is True, remitente)
    cuenta = ses.get_account()
    comprobar("B2", "La cuenta de SES puede enviar", cuenta.get("SendingEnabled") is True,
              "sandbox" if not cuenta.get("ProductionAccessEnabled") else "acceso de producción")
    inicio = datetime.now(timezone.utc)
    for destino, resultado in SIMULADOR.items():
        try:
            r = ses.send_email(
                FromEmailAddress=f"TalentERP <{remitente}>",
                Destination={"ToAddresses": [destino]},
                Content={"Simple": {
                    "Subject": {"Data": "Prueba de compatibilidad – TalentERP (ñ, tildes)", "Charset": "UTF-8"},
                    "Body": {"Html": {"Data": "<p>Prueba automática del <b>Sprint 2</b> (ISO 25010).</p>", "Charset": "UTF-8"},
                             "Text": {"Data": "Prueba automática del Sprint 2 (ISO 25010).", "Charset": "UTF-8"}},
                }},
            )
            comprobar("B2", f"SES acepta el envío al simulador de {resultado}", bool(r.get("MessageId")), destino)
        except Exception as error:  # noqa: BLE001
            comprobar("B2", f"SES acepta el envío al simulador de {resultado}", False, str(error)[:120])
    return inicio


def metricas_b2(sesion, inicio: datetime) -> None:
    print("  (esperando las métricas de SES: pueden tardar unos minutos)")
    cw = sesion.client("cloudwatch")
    for intento in range(10):
        valores = {}
        for metrica in ("Send", "Delivery", "Bounce", "Complaint"):
            datos = cw.get_metric_statistics(Namespace="AWS/SES", MetricName=metrica, StartTime=inicio - timedelta(minutes=5),
                                             EndTime=datetime.now(timezone.utc) + timedelta(minutes=5), Period=60, Statistics=["Sum"])
            valores[metrica] = int(sum(p["Sum"] for p in datos["Datapoints"]))
        if valores["Send"] >= 4 and valores["Delivery"] >= 1 and valores["Bounce"] >= 1 and valores["Complaint"] >= 1:
            break
        time.sleep(30)
    comprobar("B2", "SES registra envío, entrega, rebote y queja", valores["Send"] >= 4 and valores["Delivery"] >= 1
              and valores["Bounce"] >= 1 and valores["Complaint"] >= 1, json.dumps(valores))


# ------------------------------------------------------------------------------------------- E3
def _login(cliente: httpx.Client, url_erp: str, email: str, password: str) -> bool:
    r = cliente.post(f"{url_erp}/api/auth/login", json={"email": email, "password": password}, headers={"Origin": url_erp})
    return r.status_code == 200


def _estado_erp(cliente: httpx.Client, url_erp: str, url_portal: str) -> dict[str, int]:
    estados = {ruta: cliente.get(f"{url_erp}{ruta}").status_code
               for ruta in ("/api/postulantes", "/api/anuncios", "/api/empresas", "/api/dashboard", "/api/comunicaciones")}
    estados["portal"] = httpx.get(url_portal, timeout=20).status_code
    return estados


def _esperar_tareas(ecs, servicio: str, cantidad: int) -> None:
    """Espera a que el servicio tenga `cantidad` tareas. Para 0 no basta runningCount: una tarea que se
    está apagando deja de contarse pero sigue atendiendo mientras drena; se espera a que esté STOPPED."""
    for _ in range(60):  # hasta 10 min
        s = ecs.describe_services(cluster=PROYECTO, services=[servicio])["services"][0]
        listo = s["runningCount"] == cantidad and s["pendingCount"] == 0 and len(s["deployments"]) == 1
        if listo and cantidad == 0:
            vivas = ecs.list_tasks(cluster=PROYECTO, serviceName=servicio, desiredStatus="RUNNING")["taskArns"]
            paradas = ecs.list_tasks(cluster=PROYECTO, serviceName=servicio, desiredStatus="STOPPED")["taskArns"]
            estados = [t["lastStatus"] for t in ecs.describe_tasks(cluster=PROYECTO, tasks=paradas)["tasks"]] if paradas else []
            listo = not vivas and all(e == "STOPPED" for e in estados)
        if listo:
            if cantidad == 0:
                time.sleep(20)  # que Service Connect deje de anunciar la tarea
            return
        time.sleep(10)
    raise TimeoutError(f"{servicio} no llegó a {cantidad} tareas")


def caso_e3(sesion, url_erp: str, url_portal: str, email: str, password: str) -> None:
    print("\n== E3 · Aislamiento de fallos (apagar WhatsApp)")
    ecs = sesion.client("ecs")
    with httpx.Client(timeout=30) as cliente:
        if not comprobar("E3", "Inicio de sesión en el ERP para la prueba", _login(cliente, url_erp, email, password)):
            return
        antes = _estado_erp(cliente, url_erp, url_portal)
        comprobar("E3", "Antes: todo responde 200", all(c == 200 for c in antes.values()), json.dumps(antes))
        try:
            ecs.update_service(cluster=PROYECTO, service="servicio-comunicaciones", desiredCount=0)
            _esperar_tareas(ecs, "servicio-comunicaciones", 0)
            durante = _estado_erp(cliente, url_erp, url_portal)
            resto = {k: v for k, v in durante.items() if k != "/api/comunicaciones"}
            comprobar("E3", "Con WhatsApp caído, el resto del ERP y el portal siguen respondiendo 200",
                      all(c == 200 for c in resto.values()), json.dumps(durante))
            comprobar("E3", "WhatsApp caído responde un error controlado (no se cuelga)",
                      durante["/api/comunicaciones"] in (502, 503, 504), f"HTTP {durante['/api/comunicaciones']}")
        finally:
            ecs.update_service(cluster=PROYECTO, service="servicio-comunicaciones", desiredCount=1)
            _esperar_tareas(ecs, "servicio-comunicaciones", 1)
            print("  servicio-comunicaciones encendido otra vez")
        for _ in range(12):
            despues = _estado_erp(cliente, url_erp, url_portal)
            if despues["/api/comunicaciones"] == 200:
                break
            time.sleep(10)
        comprobar("E3", "Al volver WhatsApp, todo responde 200 sin reiniciar nada más",
                  all(c == 200 for c in despues.values()), json.dumps(despues))


# -------------------------------------------------------------------------------------------
def main() -> int:
    argumentos = argparse.ArgumentParser()
    argumentos.add_argument("--perfil", default="desarrollo")
    argumentos.add_argument("--email", default="admin@test.com", help="usuario de prueba del ERP (para E3)")
    argumentos.add_argument("--password", required=True)
    argumentos.add_argument("--casos", default="A2,A3,B2,E3", help="casos a ejecutar, ej. A2,A3 o E3")
    opciones = argumentos.parse_args()

    sesion = boto3.Session(profile_name=opciones.perfil, region_name="us-east-1")
    ssm = sesion.client("ssm")
    salidas = {o["OutputKey"]: o["OutputValue"] for o in
               sesion.client("cloudformation").describe_stacks(StackName=f"{PROYECTO}-base")["Stacks"][0]["Outputs"]}
    url_erp, url_portal = salidas["UrlErp"], salidas["UrlAnuncios"]

    casos = {c.strip().upper() for c in opciones.casos.split(",")}
    for nombre, caso in (("A2", lambda: caso_a2(ssm)), ("A3", lambda: caso_a3(ssm, url_erp))):
        if nombre not in casos:
            continue
        try:
            caso()
        except Exception as error:  # noqa: BLE001 — un caso roto no impide correr los demás
            comprobar(nombre, "Error inesperado", False, f"{type(error).__name__}: {error}"[:200])
    inicio_b2 = caso_b2(sesion, config_env()["CORREO_REMITENTE"]) if "B2" in casos else None
    if "E3" in casos:
        caso_e3(sesion, url_erp, url_portal, opciones.email, opciones.password)
    if inicio_b2:
        metricas_b2(sesion, inicio_b2)

    EVIDENCIAS.mkdir(exist_ok=True)
    filas = [f"| {c} | {d} | {'✅' if ok else '❌'} | {det} |" for c, d, ok, det in resultados]
    pasan = sum(ok for *_, ok, _ in resultados)
    reporte = EVIDENCIAS / f"sprint2-{'-'.join(sorted(casos))}.md"
    reporte.write_text("\n".join([
        "# Sprint 2 — pruebas contra el entorno real (AWS)", "",
        f"- Fecha: {datetime.now():%Y-%m-%d %H:%M} · ERP: {url_erp} · Portal: {url_portal}",
        f"- Resultado: **{pasan}/{len(resultados)}** comprobaciones pasan", "",
        "| Caso | Comprobación | Resultado | Detalle |", "|---|---|---|---|", *filas, "",
    ]), encoding="utf-8")
    print(f"\nResultado: {pasan}/{len(resultados)} · reporte en {reporte}")
    return 0 if pasan == len(resultados) else 1


if __name__ == "__main__":
    sys.exit(main())
