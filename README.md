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
 
El Front-End (Next.js) consume el Back-End a través de una API REST. El Back-End se
organiza como **microservicios por dominio** (postulantes, empresas/vacantes, procesos
de selección) detrás de un API Gateway/BFF — ver [ADR-002](./docs/decisiones/ADR-002-arquitectura-microservicios.md).
 
| Capa | Tecnología |
|---|---|
| **Frontend** | Next.js  |
| **Backend** | Python (FastAPI) — microservicios + API Gateway |
| **Base de datos** | *PostgreSQL* |
| **Comunicación** | WhatsApp Business API |

## 📄 Licencia
 
Proyecto académico — Proyecto Integrador II.
---

## 🔁 Flujo de trabajo y documentación

- **Backlog y Sprint:** GitHub Projects (campos: Status, Priority, Size, Iteration, Requirement ID, Owner).
- **Asignación del equipo:** [`docs/equipo/asignaciones.md`](./docs/equipo/asignaciones.md).
- **Historias de usuario y riesgos:** ver plantillas en `.github/ISSUE_TEMPLATE/`.
- **Cómo contribuir (ramas, commits, PR, Definition of Done):** [`CONTRIBUTING.md`](./CONTRIBUTING.md).
- **Decisiones tecnológicas (ADR):** [`docs/decisiones/`](./docs/decisiones/).
- **Gestión de riesgos:** [`docs/riesgos/`](./docs/riesgos/).
- **Entorno local (PostgreSQL vía Docker):** [`infra/`](./infra/).

