// features/dashboard/hooks/useDashboard.ts
"use client";

import { useState } from "react";
import { useCargaConCache } from "@/lib/cacheCliente";
import { DashboardDatos, FiltrosDashboard } from "../types/dashboard";
import { fetchDashboard, fetchNombresPostulantes } from "../services/dashboardService";

interface EstadoDashboard {
  datos: DashboardDatos | null;
  nombres: Record<string, string>;
  cargando: boolean; // true solo si todavía no hay NADA que mostrar (ni de un filtro anterior)
  actualizando: boolean; // ya se muestra algo, pero se están pidiendo los datos del filtro actual
  error: string | null;
}

// Carga los indicadores cada vez que cambia un filtro.
//  - Cada combinación de filtros se recuerda: volver a una ya vista (o entrar de nuevo al Dashboard) se ve
//    al instante y se actualiza en segundo plano.
//  - Mientras llegan los datos de un filtro nuevo, se siguen mostrando los del anterior (atenuados) en vez de
//    vaciar la pantalla.
//  - Los nombres de los postulantes (solo para la "Actividad reciente") se piden aparte y NO hacen esperar
//    al resto de la pantalla.
export function useDashboard(filtros: FiltrosDashboard): EstadoDashboard {
  const { desde, hasta, empresaId } = filtros;
  const clave = `dashboard:${desde}|${hasta}|${empresaId ?? "todas"}`;

  const { datos, error } = useCargaConCache<DashboardDatos>(clave, () => fetchDashboard({ desde, hasta, empresaId }), 10_000);
  const { datos: nombres } = useCargaConCache<Record<string, string>>("postulantes:nombres", fetchNombresPostulantes, 60_000);

  // Últimos datos vistos (de cualquier filtro): se muestran mientras llegan los del filtro nuevo.
  // (Se guarda "durante el render": es el patrón que React recomienda para esto.)
  const [ultimos, setUltimos] = useState<DashboardDatos | null>(null);
  if (datos !== undefined && datos !== ultimos) setUltimos(datos);

  const mostrados = datos ?? ultimos;
  return {
    datos: mostrados,
    nombres: nombres ?? {},
    cargando: mostrados === null && !error,
    actualizando: datos === undefined && mostrados !== null,
    error,
  };
}
