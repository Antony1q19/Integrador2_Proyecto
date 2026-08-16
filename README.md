# ERP de Reclutamiento y Gestión de RRHH — Proyecto Integrador II
 
Sistema ERP orientado a una **consultora de reclutamiento**, que centraliza todo el ciclo de vida del proceso de selección: desde el primer contacto con el postulante, pasando por evaluación, seguimiento del proceso, comunicación vía WhatsApp, hasta la contratación final y el seguimiento post-ingreso.
 
> Proyecto desarrollado como parte del curso **Proyecto Integrador II**.
 
---
 
## 📋 Descripción del proyecto
 
El sistema resuelve la gestión integral de procesos de reclutamiento para una consultora que atiende a múltiples empresas clientes. Permite administrar:
 
- **Base de postulantes**: registro, documentos, evaluaciones y estado del proceso de cada candidato.
- **Anuncios de requerimientos**: vacantes solicitadas por las empresas clientes.
- **Empresas clientes**: gestión de las organizaciones que solicitan personal.
- **Comunicación**: módulo de mensajería integrado con WhatsApp Business API.
- **Roles de acceso**: Administrador, RRHH y Supervisor, cada uno con permisos diferenciados.
- **Seguimiento completo**: desde el contacto inicial del postulante hasta su contratación y adaptación en el puesto.
---
 
## 🧱 Arquitectura
 
El proyecto está dividido en dos repositorios/módulos independientes que se comunican vía API REST:
 
| Capa | Tecnología |
|---|---|
| **Frontend** | Next.js  |
| **Backend** | Java |
| **Base de datos** | *PostgreSQL* |
| **Comunicación** | WhatsApp Business API |

## 📄 Licencia
 
Proyecto académico — Proyecto Integrador II.