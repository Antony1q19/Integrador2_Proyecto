# Guía de colaboración — ERP de Reclutamiento


## 1. Flujo de trabajo (GitHub Flow)

1. Elige o crea un issue (historia o riesgo) usando las plantillas de `.github/ISSUE_TEMPLATE/`.
2. Ubícalo en el GitHub Project del Sprint (columna/estado correspondiente).
3. Actualiza `main` y crea una rama corta desde ahí:
   ```bash
   git switch main
   git pull --ff-only
   git switch -c feat/HU-04-listado-busqueda-postulantes
   ```
4. Haz commits pequeños y explicativos (ver convención abajo).
5. Publica la rama y abre un pull request con la plantilla (`.github/pull_request_template.md`),
   vinculando el issue con `Closes #NN`.
6. Espera a que el workflow de CI (`.github/workflows/ci.yml`) pase en verde.
7. Solicita revisión de otra persona del equipo; responde sus comentarios con
   cambios o argumentos verificables.
8. Integra con squash merge cuando el PR esté aprobado y elimina la rama remota.

## 2. Convención de ramas y commits

| Tipo | Ejemplo |
|---|---|
| Rama de funcionalidad | `feat/HU-05-registro-nuevo-postulante` |
| Rama de corrección | `fix/HU-04-filtro-especialidad` |
| Rama de documentación | `docs/riesgos-semana-03` |
| Commit | `feat(frontend): add applicant search filters` |
| Commit | `docs(riesgos): registrar R-07 duplicidad de anuncios` |

## 3. Definition of Done

Una historia se considera terminada cuando:

- [ ] Cumple todos sus criterios de aceptación.
- [ ] Es responsive (320 / 768 / 1440 px) y accesible por teclado.
- [ ] `npm run lint` y `npm run build` pasan sin errores.
- [ ] Fue revisada por al menos otra persona del equipo.
- [ ] No introduce datos personales reales ni secretos.
- [ ] La documentación relevante (`docs/`) quedó actualizada.

## 4. Dónde vive cada cosa

| Necesitas... | Ve a... |
|---|---|
| Backlog y tablero del Sprint | GitHub Projects |
| Historias de usuario y criterios | GitHub Issues (plantilla "Historia de usuario") |
| Riesgos del proyecto | `docs/riesgos/` + issues con la etiqueta `riesgo` |
| Decisiones tecnológicas (ADR) | `docs/decisiones/` |
| Flujo, wireframes y prototipo | `docs/ux/README.md` + Figma |
| Entorno local (PostgreSQL) | `infra/README.md` |
| Documentos de planificación (Sprint 1, Semanas 2-3) | `frontend/documentacion/` |
