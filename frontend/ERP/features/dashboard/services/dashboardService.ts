// features/dashboard/services/dashboardService.ts
//
// Pide los indicadores al backend (navegador -> /api/dashboard (Next.js) -> Gateway -> servicio-procesos-seleccion).
import { DashboardDatos, FiltrosDashboard } from "../types/dashboard";
import { mensajeDeError, sesionVencida } from "@/lib/apiCliente";

export async function fetchDashboard(filtros: FiltrosDashboard): Promise<DashboardDatos> {
  const parametros = new URLSearchParams({ desde: filtros.desde, hasta: filtros.hasta });
  if (filtros.empresaId !== null) parametros.set("empresaId", String(filtros.empresaId));

  const res = await fetch(`/api/dashboard?${parametros}`);
  if (res.status === 401) throw new Error(sesionVencida());
  if (!res.ok) throw new Error(await mensajeDeError(res, "No se pudieron cargar los indicadores"));
  return res.json();
}

// Nombres de los postulantes (id -> "Nombre Apellido"), solo para mostrar quién aparece en la actividad
// reciente. Es opcional: si falla, se muestra sin nombres. La lista ya viene filtrada por empresas.
export async function fetchNombresPostulantes(): Promise<Record<string, string>> {
  const res = await fetch("/api/postulantes");
  if (!res.ok) return {};
  const dtos: { id: string; nombres: string; apellidos: string }[] = await res.json();
  return Object.fromEntries(dtos.map((p) => [p.id, `${p.nombres} ${p.apellidos}`]));
}
