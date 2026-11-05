# Pruebas contra el entorno real (Sprint 2)

Se ejecutan con la app **prendida** en AWS y una sesión de AWS CLI (perfil `desarrollo`). No crean,
cambian ni borran datos de la aplicación.

```powershell
.\infra\aws\prender.ps1
python tests\compatibilidad\entorno_real\sprint2.py --password <clave de admin@test.com>
.\infra\aws\apagar.ps1
```

| Caso | Qué hace | ¿Modifica algo? |
|---|---|---|
| A2 | Consulta a la Graph API de Meta el número, las plantillas (con los mismos campos que pide el ERP), la cuenta WABA y el formato de error con un token inválido | No (solo lectura) |
| A3 | Llama al webhook real por CloudFront: verificación de Meta, notificación firmada con la clave real de la app, sin firma y con firma falsa | No: el estado es de un mensaje que no existe |
| B2 | Envía 4 correos con el remitente real al simulador de Amazon SES (entrega, rebote, queja, supresión) y lee las métricas de SES | Solo métricas de envío de SES (el simulador no afecta la reputación) |
| E3 | Apaga `servicio-comunicaciones`, comprueba que el ERP y el portal siguen funcionando y lo vuelve a encender (siempre, aunque falle) | Unos minutos sin WhatsApp; se restaura solo |

`--casos A2,A3,B2` elige los casos (sin E3 no se apaga WhatsApp). El reporte queda en `tests/evidencias/sprint2-<casos>.md`.

Quedan **manuales** (necesitan un celular o cuentas personales): A4 (enviar/recibir con el número
de prueba de Meta), B3 (cómo se ve el correo en Gmail/Outlook/iPhone) y B4 (mail-tester.com).
