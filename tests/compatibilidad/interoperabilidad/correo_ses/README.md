# Interoperabilidad con Amazon SES (correo)

## Automáticas (Sprint 1) — `python tests/ejecutar.py correo-ses`

| Caso | Qué garantiza |
|---|---|
| B1 | El correo sale por la API SESv2 con remitente `TalentERP <remitente>`, destinatario y asunto/cuerpo en UTF-8. Un remitente sin verificar (sandbox) o el límite de envío se explican al usuario. Los enlaces apuntan al portal, con el correo bien codificado (`+` incluido) y sin inyección de HTML. Un fallo de SES no rompe "olvidé mi contraseña". |

## Manuales (Sprint 2, con la app prendida)

**B2 — Simulador de buzones de SES** (funciona aunque la cuenta esté en el sandbox, no afecta la reputación)

Registra postulantes con estos correos y usa "Solicitar cuenta" / "Olvidé mi contraseña":

| Dirección | Resultado esperado |
|---|---|
| `success@simulator.amazonses.com` | Entregado |
| `bounce@simulator.amazonses.com` | Rebote (hard bounce) |
| `complaint@simulator.amazonses.com` | Queja de spam |
| `suppressionlist@simulator.amazonses.com` | Rechazado por lista de supresión |

Evidencia: SES > *Account dashboard* > métricas de envío, rebote y queja del día.

**B3 — Cómo se ve en cada cliente de correo**
Envía la invitación a cuentas de Gmail, Outlook.com, Yahoo y a un iPhone (o usa Email on Acid /
Litmus). Evidencia: una captura por cliente (escritorio y móvil).

**B4 — Autenticación y spam**
Envía la invitación a la dirección que da **mail-tester.com** y guarda el puntaje. En Gmail,
"Mostrar original" → revisa `SPF`, `DKIM` y `DMARC`. Con remitente `@gmail.com` DMARC no alinea
(hallazgo H7): repetir tras configurar un dominio propio con Easy DKIM en SES.
