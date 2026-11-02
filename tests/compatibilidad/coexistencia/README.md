# Co-existencia

Que TalentERP funcione bien **compartiendo** entorno y recursos, sin perjudicar a otros ni ser
perjudicado: 7 servicios en la misma red y el mismo RDS, el ERP y el portal en el mismo Gateway y el
mismo navegador, y el proyecto junto a otros recursos de la cuenta de AWS.

## Automáticas (Sprint 1)

| Caso | Suite | Qué garantiza |
|---|---|---|
| E2, E6 | `coexistencia-infraestructura` | Lee `infra/aws/*.yaml`: límites propios de CPU/memoria, puertos, logs y esquemas de datos por servicio; los pools de conexiones de todos juntos no pasan del 50 % del máximo de RDS; solo gateway/ERP/portal detrás del balanceador; la base solo acepta a los servicios; mínimo privilegio en IAM; ningún secreto en texto plano; todo con el prefijo del proyecto y logs con retención. |
| E4 | `coexistencia-sesiones` | Un token del portal no abre nada del ERP y viceversa; tokens de otro sistema, sin audiencia o vencidos se rechazan. |

## Manuales y de carga (Sprints 2 y 3, con la app prendida)

**E1 / E2 / E5 — Carga mixta simultánea con k6** (Sprint 3)
1. Instala k6 (`winget install k6`).
2. Escenario en paralelo durante 10 min: 20 usuarios del ERP (listar postulantes, dashboard), 50
   visitantes del portal (anuncios), y una ráfaga de webhooks firmados (estados de mensajes).
3. Mira en CloudWatch: latencia p95 y 5xx del balanceador, CPU/memoria de cada servicio en ECS,
   `DatabaseConnections` y CPU de RDS.
4. Aceptación: p95 < 1 s, < 1 % de errores, ningún servicio llega al 100 % de CPU/memoria por culpa de
   otro y RDS no pasa del 50 % de conexiones.

**E3 — Aislamiento de fallos** (Sprint 2)
```powershell
aws ecs update-service --cluster talenterp --service servicio-comunicaciones --desired-count 0 --profile desarrollo
```
Con WhatsApp apagado, el ERP (postulantes, anuncios, dashboard) y el portal deben seguir funcionando y
la pantalla de comunicaciones debe mostrar un aviso claro. Restaurar con `--desired-count 1`.
Evidencia: capturas + log. (Versión formal: un experimento de AWS FIS que detiene la tarea.)

**E4-navegador** (Sprint 2): abre el ERP y el portal a la vez en el mismo navegador con usuarios
distintos, cierra sesión en uno y comprueba que el otro sigue activo (las cookies viven en dominios
distintos de CloudFront).
