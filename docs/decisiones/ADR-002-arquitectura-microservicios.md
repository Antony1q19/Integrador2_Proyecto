# ADR-002 — Arquitectura de microservicios para el Back-End

| Campo | Contenido |
|---|---|
| **ID y título** | ADR-002 — Arquitectura de microservicios para el Back-End |
| **Estado** | Aceptado |
| **Fecha y responsables** | 31 de agosto de 2026 — Jefatura de proyecto y equipo de desarrollo |
| **Contexto** | El ADR-001 fijó Next.js + FastAPI + PostgreSQL y mencionaba, como línea base institucional, un monolito modular. El equipo asignó las 13 historias de usuario del backlog a 4 integrantes por dominio funcional (Leonardo: HU-01/02/03; Xavier: HU-06/07/08/09; Marco: HU-10/11/12; Adam: HU-04/05/13), lo que hace evidente una división natural del Back-End por dominio: postulantes, empresas/vacantes y procesos de selección. Se requiere una arquitectura que permita a cada integrante desarrollar, probar y desplegar su parte sin bloquear a los demás. |
| **Alternativas** | A) Monolito modular: un único servicio FastAPI con módulos internos por dominio, una sola base de código y un solo proceso de despliegue. B) Microservicios: un servicio FastAPI independiente por dominio (postulantes, empresas/vacantes, procesos de selección), cada uno con su propio contenedor y esquema/base de datos, expuestos al Front-End a través de un API Gateway/BFF. |
| **Decisión** | Adoptar la alternativa B: microservicios por dominio detrás de un API Gateway/BFF. Estructura inicial: `backend/gateway/` (enruta las peticiones del Front-End Next.js hacia cada microservicio y centraliza autenticación/CORS), `backend/servicio-postulantes/`, `backend/servicio-empresas-vacantes/` y `backend/servicio-procesos-seleccion/`, cada uno un proyecto FastAPI independiente con sus propios modelos, esquemas Pydantic y migraciones sobre PostgreSQL (esquema propio o base propia por servicio). La comunicación entre Front-End y Gateway, y entre Gateway y cada servicio, es REST síncrona sobre HTTP en esta etapa del curso. |
| **Consecuencias** | Beneficio principal: cada integrante puede avanzar su módulo (y sus historias asignadas) de forma independiente, con menor riesgo de conflictos de código y despliegues acoplados. Costos aceptados: más piezas que configurar y documentar (un `Dockerfile` y una entrada en `infra/compose.yaml` por servicio, más el Gateway), necesidad de definir contratos de API estables entre servicios desde el inicio, y ausencia (por ahora) de mecanismos avanzados de resiliencia entre servicios (reintentos, *circuit breaker*, mensajería asíncrona), que quedan fuera de alcance del curso y se documentan como trabajo futuro. |
| **Criterio de revisión** | Si hacia el Sprint 2 el equipo no logra levantar y mantener los servicios de forma reproducible (`docker compose config` fallando, integración Gateway-servicio inestable, o sobrecarga operativa desproporcionada para el tamaño del equipo), se reevalúa consolidar temporalmente dos o más servicios en la retrospectiva correspondiente, sin perder la separación de dominios a nivel de código. |
| **Enlaces** | [ADR-001 — Selección de stack tecnológico](./ADR-001-stack-tecnologico.md); `docs/equipo/asignaciones.md`; `frontend/documentacion/Semana2_Entorno_Colaboracion_UX_Reclutamiento.docx` (secciones 4 a 7, actualizadas con esta decisión). |

> 🧭 Este ADR reemplaza, en lo referente al estilo arquitectónico del Back-End, la
> mención a "monolito modular" que aparecía en el ADR-001 y en la versión inicial del
> documento de la Semana 2. El ADR-001 sigue vigente para la selección de lenguaje,
> framework y base de datos.
