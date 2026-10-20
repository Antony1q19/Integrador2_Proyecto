# ANUNCIOS — Portal Público de Empleos y Postulantes

Aplicación pública construida con **Next.js (App Router)** para que las personas puedan consultar ofertas de empleo, postular y gestionar su cuenta.

## Características y Autenticación Real

- **Conexión real al Backend**: Se comunica con el API Gateway (`GATEWAY_INTERNAL_URL`) a través de Route Handlers seguros en `app/api/auth/*`.
- **Sesión segura por Cookie httpOnly**: El token JWT de sesión (`authToken`, vigencia de 1 hora) se almacena en una cookie `httpOnly` (`SameSite=Lax`, `Secure` en producción). El navegador nunca expone el token al JavaScript del cliente.
- **Protección de rutas**: `middleware.ts` protege las rutas privadas (`/perfil` e `/his_postulaciones`), redirigiendo a `/login?siguiente=...` si no existe sesión.
- **Registro con trazabilidad**: Exige aceptar la Política de Privacidad y Términos y Condiciones conforme a la Ley N.º 29733 (versión `2026-01`).
- **Recuperación de contraseña**: Flujo con enlace único firmado por correo electrónico (Amazon SES) y formulario seguro de restablecimiento (`/restablecer-password`).
- **Separación estricta ERP / ANUNCIOS**: Los tokens de postulante portan `aud: "anuncios"` y `rol: "Postulante"`, impidiendo cualquier acceso a las rutas administrativas del ERP.
- **Datos reales**: Toda la autenticación e historial operan contra el backend en AWS.

## Estructura de Páginas

| Ruta | Descripción | Acceso |
|---|---|---|
| `/` | Listado general de anuncios de empleo vigentes | Público |
| `/anuncios/[id]` | Detalle del anuncio y botón de postulación | Público |
| `/login` | Inicio de sesión para postulantes con protección de fuerza bruta | Público |
| `/registro` | Creación de cuenta con validación de contraseña y términos | Público |
| `/recuperar-password` | Solicitud de enlace de recuperación por correo | Público |
| `/restablecer-password` | Formulario de cambio de contraseña con token | Público (con token) |
| `/perfil` | Panel de perfil con datos reales de la sesión | Protegido (Postulante) |
| `/his_postulaciones` | Historial de ofertas a las que ha postulado | Protegido (Postulante) |
| `/legal/privacidad` | Términos y Condiciones y Política de Privacidad (versión 2026-01) | Público |

## Despliegue

Corre en AWS ECS Fargate (puerto 3001) detrás de CloudFront. La imagen se construye con el
`Dockerfile` de esta carpeta y la publica `infra/aws/publicar.ps1`. Las variables
(`GATEWAY_INTERNAL_URL`, `FRONTEND_PROXY_SECRET`) las pone la tarea de ECS (`infra/aws/app.yaml`).
