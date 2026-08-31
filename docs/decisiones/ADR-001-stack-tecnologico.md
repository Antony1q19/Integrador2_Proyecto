# ADR-001 — Selección de stack tecnológico (Front-End, Back-End y Datos)

| Campo | Contenido |
|---|---|
| **Estado** | Aceptado |
| **Fecha y responsables** | 31 de agosto de 2026 — Jefatura de proyecto y equipo de desarrollo |
| **Contexto** | El equipo tiene experiencia previa en JavaScript/TypeScript y Python; el proyecto tiene una restricción de 18 semanas y requiere integración ágil entre Front-End y Back-End mediante una API REST bien documentada. |
| **Alternativas** | A) Next.js + FastAPI + PostgreSQL. B) Angular + Spring Boot (Java) + PostgreSQL, mencionado en el `README.md` original del proyecto. |
| **Decisión** | Adoptar **Next.js** (Front-End), **FastAPI** (Back-End, Python) y **PostgreSQL** (Datos). El estilo arquitectónico del Back-End (microservicios) se detalla en [ADR-002 — Arquitectura de microservicios](./ADR-002-arquitectura-microservicios.md). |
| **Consecuencias** | Se gana velocidad de desarrollo y una curva de aprendizaje menor para el equipo. Se debe documentar con rigor los contratos de la API (esquemas Pydantic y OpenAPI), ya que no existe tipado compartido nativo entre Python y TypeScript. |
| **Criterio de revisión** | Si el equipo no logra avanzar el Sprint 2 (integración Back-End) por falta de soporte o incompatibilidades, se reevalúa esta decisión. |
| **Enlaces** | `frontend/documentacion/Semana2_Entorno_Colaboracion_UX_Reclutamiento.docx` (matriz de decisión completa). |

> ✅ **Confirmado (31 de agosto de 2026):** el equipo confirmó Python/FastAPI como
> Back-End. El `README.md` de la raíz ya fue actualizado ("Backend: Python (FastAPI)")
> para que coincida con esta decisión; no quedan decisiones contradictorias en el repositorio.

> 🧭 **Actualización (31 de agosto de 2026):** el estilo arquitectónico del Back-End quedó
> definido en [ADR-002 — Arquitectura de microservicios](./ADR-002-arquitectura-microservicios.md)
> (microservicios por dominio detrás de un API Gateway, en lugar del monolito modular
> mencionado inicialmente en este ADR). Este ADR-001 queda limitado a la selección de
> lenguaje, framework y base de datos.
