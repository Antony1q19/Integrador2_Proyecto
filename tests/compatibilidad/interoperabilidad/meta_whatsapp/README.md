# Interoperabilidad con Meta WhatsApp Cloud API

## Automáticas (Sprint 1) — `python tests/ejecutar.py meta-whatsapp`

| Caso | Archivo | Qué garantiza |
|---|---|---|
| A1 | `test_cliente_whatsapp.py` | Texto, plantillas, "leído" y gestión de plantillas salen con el formato exacto de la Graph API (`v23.0`), con el token en la cabecera y UTF-8/emojis intactos. Cada error de Meta (131030, 100, 190, 200, 10, 131031, 130429, 4, 5xx, HTML) se traduce al código correcto: 400 si es culpa del dato, 503 si es de la cuenta o de Meta. |
| A3 | `test_webhook_formatos_meta.py` | El webhook acepta los formatos reales de Meta (texto, imagen con pie, estados), no duplica mensajes cuando Meta reintenta, los estados nunca retroceden y un cuerpo inválido no rompe el servicio. |
| A5 | `test_cliente_whatsapp.py` | Cambiar de versión de la Graph API es solo cambiar `META_API_VERSION`. |

## Manuales (Sprint 2, con la app prendida)

**A2 — Contrato contra la colección oficial de Meta**
1. En Postman, importa la colección pública *WhatsApp Business Platform / Cloud API* de Meta.
2. Variables: `Version` = `v23.0`, `Phone-Number-ID`, `WABA-ID` y el token (los tres están en SSM:
   `/talenterp/meta/...`; nunca los guardes en la colección exportada).
3. Ejecuta *Send Text Message* y *Get Message Templates*; exporta el reporte con Newman:
   `newman run coleccion.json -e entorno.json -r htmlextra`.
4. Evidencia: el reporte HTML.

**A3-real — Cargas de prueba de Meta**
Meta > tu app > WhatsApp > Configuración > Webhooks > campo `messages` > **Test**. Meta envía una
carga de ejemplo firmada a `https://<ERP>/api/v1/publico/webhook/whatsapp`. Evidencia: respuesta 200
en Meta y la línea del log en CloudWatch `/talenterp/servicio-comunicaciones`.

**A4 — De punta a punta con el número de prueba**
1. En *API Setup*, agrega tu celular como destinatario del número de prueba (máximo 5).
2. Desde el ERP envía un mensaje a ese postulante → debe llegar en < 10 s.
3. Respóndelo desde el celular → debe aparecer en el ERP con ✓✓ azules al abrirlo.
4. Evidencia: capturas del ERP y del celular con la hora.
