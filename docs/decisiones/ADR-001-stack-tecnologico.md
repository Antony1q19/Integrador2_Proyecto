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

