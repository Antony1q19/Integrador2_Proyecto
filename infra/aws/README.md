# Despliegue en AWS (CloudFormation)

Todo TalentERP corre en AWS: **ECS Fargate** (7 servicios), **RDS PostgreSQL** (base de datos),
**S3** (documentos), **SES** (correos), **CloudFront** (HTTPS y URLs fijas, también para el webhook
de WhatsApp), **ECR** (imágenes), **CodeBuild** (construye las imágenes), **SSM Parameter Store** (secretos), **CloudWatch** (logs) y
**AWS Budgets** (alerta de gasto). Región: `us-east-1`.

```
 Usuarios ──► CloudFront ERP ───────┐          Meta (WhatsApp) ──► CloudFront ERP /api/v1/publico/webhook/whatsapp
 Usuarios ──► CloudFront Anuncios ──┤
                                    ▼  (solo acepta tráfico de CloudFront)
            ┌──────────── VPC ── Application Load Balancer ───────────────┐
            │   ERP (Next.js) ─┐                                          │
            │   Anuncios ──────┴─► gateway ─► postulantes ──► S3 / SES     │
            │                         ├─────► empresas-vacantes           │
            │                         ├─────► procesos-seleccion          │
            │                         └─────► comunicaciones ──► Meta API │
            │            (ECS Fargate + Service Connect)                  │
            │   subredes privadas: RDS PostgreSQL (un esquema por servicio)│
            └─────────────────────────────────────────────────────────────┘
```

## Dos stacks

| Stack | Plantilla | Contenido | Costo |
|---|---|---|---|
| `talenterp-base` | `base.yaml` | ECR, CodeBuild, S3 de documentos, CloudFront (x2), SES, roles IAM, logs, presupuesto | < US$ 1/mes (+ ~US$ 0.10 por publicación) |
| `talenterp-app` | `app.yaml` | VPC, balanceador, ECS (7 servicios), RDS | ~US$ 0.20/hora **solo mientras está prendido** |

Al **apagar**, la base de datos guarda un **snapshot final** y el próximo encendido la restaura:
los datos nunca se pierden. Los documentos viven en S3 (stack base) y tampoco se pierden.

## Requisitos

- Windows PowerShell 5.1 (viene con Windows) o PowerShell 7.
- [AWS CLI v2](https://aws.amazon.com/cli/) con sesión iniciada con el perfil de `config.env`:
  `aws login --profile desarrollo --region us-east-1` (o `aws configure --profile desarrollo` con una
  access key de un usuario IAM con permisos de administrador).
- git (para saber qué archivos subir). **No hace falta Docker**: las imágenes se construyen en AWS
  CodeBuild con los `Dockerfile` de `backend/` y `frontend/`.
- Los datos de WhatsApp de Meta a mano (token, clave secreta de la app, IDs): `configurar.ps1` los
  pide por consola la primera vez. No hay archivos `.env`: los secretos viven solo en SSM.

## Uso diario

Desde la carpeta raíz del proyecto, en PowerShell:

```powershell
.\infra\aws\prender.ps1     # 15-20 min. Muestra las URLs al terminar.
.\infra\aws\apagar.ps1      # 10-15 min. Guarda los datos y deja de cobrar por hora.
.\infra\aws\publicar.ps1    # Después de cambiar código: CodeBuild construye y sube las imágenes (8-12 min).
.\infra\aws\configurar.ps1 -Meta  # Cambiar los datos de WhatsApp (ej. token nuevo de Meta).
```

Si Windows no deja ejecutar scripts ("la ejecución de scripts está deshabilitada"), habilítalos una
vez para tu usuario: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, o ejecuta cada uno con
`powershell -ExecutionPolicy Bypass -File .\infra\aws\prender.ps1`.

## Fin del curso

```powershell
.\infra\aws\finalizar.ps1   # Borra TODO (pide escribir "BORRAR TODO"). Irreversible.
```

Borra los dos stacks, todos los snapshots, el bucket de documentos, los secretos y los logs, y al
final comprueba que no quede ningún recurso con la etiqueta `Proyecto=talenterp`.

## Sin snapshot

Si no hay ningún snapshot (por ejemplo, después de `finalizar.ps1`), `prender.ps1` crea la base vacía
(PostgreSQL 17) y cada servicio crea sus tablas al arrancar (`INICIALIZAR_BD=true`).

## Después del primer encendido

1. **Correo:** Amazon SES envía un enlace de verificación a `CORREO_REMITENTE` (`config.env`): hay que
   hacer clic. Mientras la cuenta esté en el *sandbox* de SES, solo se puede enviar a correos
   verificados; para enviar a cualquiera: SES > *Account dashboard* > *Request production access*.
2. **WhatsApp:** en Meta > WhatsApp > Configuración > Webhook, poner la URL que muestra `prender.ps1`
   (`https://dxxxx.cloudfront.net/api/v1/publico/webhook/whatsapp`) y el mismo *token de
   verificación* de siempre. La URL es fija: no cambia al prender/apagar.
3. **Clave secreta de la app de Meta:** si quedó pendiente, ejecutar `configurar.ps1 -Meta` (sin esa
   clave el webhook rechaza todos los mensajes, por seguridad).

## Secretos (SSM Parameter Store)

Todos viven cifrados en SSM bajo `/talenterp/...` y ECS se los entrega a cada contenedor al arrancar.
No hay copias en archivos: para ver uno, `aws ssm get-parameter --name /talenterp/<nombre> --with-decryption`.

| Parámetro | Quién lo crea |
|---|---|
| `bd/password` | `configurar.ps1`, aleatoria, una sola vez (nunca cambia: los snapshots la necesitan) |
| `jwt-secret`, `gateway-shared-secret`, `frontend-proxy-secret` | `configurar.ps1`, aleatorias; `-RotarClaves` genera nuevas (cierra todas las sesiones) |
| `meta/access-token`, `meta/app-secret`, `meta/verify-token`, `meta/phone-number-id`, `meta/waba-id` | Tú, por consola con `configurar.ps1` (o `-Meta` para cambiarlos) |

Si la app está prendida, `configurar.ps1` reinicia los servicios cuando cambia algo.

## Seguridad

- Nada entra al balanceador si no viene de CloudFront (lista de IPs de CloudFront + cabecera secreta).
- Del backend solo es público el webhook de WhatsApp; el resto se llama solo desde los Next.js.
- Base de datos en subredes privadas, cifrada, solo accesible desde los servicios.
- Bucket de documentos privado, cifrado y solo por HTTPS; solo el servicio de postulantes puede leerlo.
- Secretos cifrados en SSM; los contenedores no llevan ninguna clave dentro de la imagen.
- Cada servicio tiene solo los permisos de AWS que necesita (rol de IAM por tarea).
