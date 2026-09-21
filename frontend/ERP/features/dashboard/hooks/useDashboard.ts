// features/dashboard/hooks/useDashboard.ts
"use client";

import { useEffect, useState } from "react";
import { DashboardDatos, FiltrosDashboard } from "../types/dashboard";
import { fetchDashboard, fetchNombresPostulantes } from "../services/dashboardService";

interface EstadoDashboard {
  datos: DashboardDatos | null;
  nombres: Record<string, string>;
  cargando: boolean;
  error: string | null;
}

// Carga los indicadores cada vez que cambia un filtro. Si el usuario cambia de filtro mientras
// se está cargando, se descarta la respuesta vieja (para no mostrar datos de un filtro anterior).
export function useDashboard(filtros: FiltrosDashboard): EstadoDashboard {
  const [estado, setEstado] = useState<EstadoDashboard>({ datos: null, nombres: {}, cargando: true, error: null });
  const { desde, hasta, empresaId } = filtros;

  useEffect(() => {
    let cancelado = false;
    // Se mantienen los datos anteriores en pantalla mientras llegan los nuevos.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEstado((previo) => ({ ...previo, cargando: true, error: null }));

    Promise.all([fetchDashboard({ desde, hasta, empresaId }), fetchNombresPostulantes().catch(() => ({}))])
      .then(([datos, nombres]) => {
        if (!cancelado) setEstado({ datos, nombres, cargando: false, error: null });
      })
      .catch((e) => {
        if (!cancelado) {
          setEstado((previo) => ({
            ...previo,
            cargando: false,
            error: e instanceof Error ? e.message : "No se pudieron cargar los indicadores",
          }));
        }
      });

    return () => {
      cancelado = true;
    };
  }, [desde, hasta, empresaId]);

  return estado;
}
