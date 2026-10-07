// lib/permisos.ts
//
// Matriz de roles del ERP (la MISMA que aplica el backend; esto solo decide qué botones y
// pantallas se muestran, la seguridad real está en los microservicios):
//
//   - Admin:      todo.
//   - Supervisor: gestiona todo lo de sus empresas asignadas: postulantes, etapas, entrevistas,
//                 contrataciones, seguimientos, evaluaciones y ANUNCIOS (crea, edita, cierra,
//                 elimina). Edita los datos de sus empresas, pero no crea ni elimina empresas.
//                 Ve el Dashboard.
//   - RRHH:       reclutamiento: postulantes, etapas, entrevistas, contrataciones, seguimientos y
//                 evaluaciones. Solo VE anuncios y empresas (no los crea ni modifica). No ve el
//                 Dashboard.
//
// Este archivo no tiene "use client": `permisosDe` también se usa en componentes de servidor.
// En componentes de cliente, usar el hook `usePermisos` (lib/usePermisos.ts).

export interface Permisos {
  rol: string;
  puedeVerDashboard: boolean;
  puedeGestionarAnuncios: boolean;
  puedeEditarEmpresas: boolean;
  puedeCrearEliminarEmpresas: boolean;
  puedeGestionarSeleccion: boolean;
}

export function permisosDe(rol: string | undefined): Permisos {
  const r = rol ?? "";
  const esAdmin = r === "Admin";
  const esSupervisor = r === "Supervisor";
  return {
    rol: r,
    puedeVerDashboard: esAdmin || esSupervisor,
    puedeGestionarAnuncios: esAdmin || esSupervisor,
    puedeEditarEmpresas: esAdmin || esSupervisor,
    puedeCrearEliminarEmpresas: esAdmin,
    puedeGestionarSeleccion: esAdmin || esSupervisor || r === "RRHH",
  };
}
