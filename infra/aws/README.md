# Despliegue en AWS (CloudFormation)

Todo TalentERP corre en AWS: **ECS Fargate** (7 servicios), **RDS PostgreSQL** (base de datos),
**S3** (documentos), **SES** (correos), **CloudFront** (HTTPS y URLs fijas, también para el webhook
de WhatsApp), **ECR** (imágenes), **SSM Parameter Store** (secretos), **CloudWatch** (logs) y
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
| `talenterp-base` | `base.yaml` | ECR, S3 de documentos, CloudFront (x2), SES, roles IAM, logs, presupuesto | < US$ 1/mes |
| `talenterp-app` | `app.yaml` | VPC, balanceador, ECS (7 servicios), RDS | ~US$ 0.20/hora **solo mientras está prendido** |

Al **apagar**, la base de datos guarda un **snapshot final** y el próximo encendido la restaura:
los datos nunca se pierden. Los documentos viven en S3 (stack base) y tampoco se pierden.

## Requisitos

- [AWS CLI v2](https://aws.amazon.com/cli/) con sesión iniciada: `aws login --region us-east-1`
  (o `aws configure` con una access key de un usuario IAM con permisos de administrador).
- Docker Desktop encendido (para construir las imágenes).
- Git Bash (Windows) o cualquier terminal bash.
- Los `.env` locales de `backend/` completos (de ahí salen los secretos).

## Uso diario

```bash
bash infra/aws/prender.sh     # 15-20 min. Muestra las URLs al terminar.
bash infra/aws/apagar.sh      # 10-15 min. Guarda los datos y deja de cobrar por hora.
bash infra/aws/publicar.sh    # Después de cambiar código: construye y sube las imágenes.
bash infra/aws/configurar.sh  # Después de cambiar un secreto en un .env (ej. token de Meta).
```

## Fin del curso

```bash
bash infra/aws/finalizar.sh   # Borra TODO (pide escribir "BORRAR TODO"). Irreversible.
```

Borra los dos stacks, todos los snapshots, el bucket de documentos, los secretos y los logs, y al
final comprueba que no quede ningún recurso con la etiqueta `Proyecto=talenterp`.

## La primera vez

`prender.sh` detecta que no hay snapshot y:
1. Crea la base vacía (PostgreSQL 17) con los servicios **apagados**.
2. Copia los datos de Supabase a RDS con una tarea de ECS (`pg_dump` → `psql`, dentro de la VPC).
3. Copia los documentos de Supabase Storage a S3 (misma ruta).
4. Borra de AWS las credenciales de Supabase (la migración no se repite) y enciende los servicios.

Los datos de origen salen de `infra/aws/.migracion.env` (git lo ignora; `finalizar.sh` lo borra).

## Después del primer encendido

1. **Correo:** Amazon SES envía un enlace de verificación a `CORREO_REMITENTE` (`config.env`): hay que
   hacer clic. Mientras la cuenta esté en el *sandbox* de SES, solo se puede enviar a correos
   verificados; para enviar a cualquiera: SES > *Account dashboard* > *Request production access*.
2. **WhatsApp:** en Meta > WhatsApp > Configuración > Webhook, poner la URL que muestra `prender.sh`
   (`https://dxxxx.cloudfront.net/api/v1/publico/webhook/whatsapp`) y el mismo *token de
   verificación* de siempre. La URL es fija: no cambia al prender/apagar.
3. **Clave secreta de la app de Meta:** ponerla en `META_APP_SECRET` de
   `backend/servicio-comunicaciones/.env` y ejecutar `configurar.sh` + `publicar.sh` (en producción,
   sin esa clave el webhook rechaza todos los mensajes, por seguridad).

## Seguridad

- Nada entra al balanceador si no viene de CloudFront (lista de IPs de CloudFront + cabecera secreta).
- Del backend solo es público el webhook de WhatsApp; el resto se llama solo desde los Next.js.
- Base de datos en subredes privadas, cifrada, solo accesible desde los servicios.
- Bucket de documentos privado, cifrado y solo por HTTPS; solo el servicio de postulantes puede leerlo.
- Secretos cifrados en SSM; los contenedores no llevan ninguna clave dentro de la imagen.
- Cada servicio tiene solo los permisos de AWS que necesita (rol de IAM por tarea).
