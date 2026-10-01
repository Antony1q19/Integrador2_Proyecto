// features/contrataciones/components/ContratacionesView.tsx
//
// Página "Contrataciones": todas las contrataciones que la persona puede ver (según sus empresas asignadas) con el estado
// de sus controles post-ingreso. Cada fila se abre para ver el detalle y registrar los seguimientos.
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, BadgeCheck, ChevronDown, Clock, UserCheck } from "lucide-react";
import { Skeleton } from "@/components/shared/Skeleton";
import { ToastContainer, useToast } from "@/components/shared/Toast";
import { useReferenciasSeleccion } from "@/features/postulantes/hooks/useReferenciasSeleccion";
import { useCargaConCache } from "@/lib/cacheCliente";
import { formatoFecha } from "@/lib/fechasLima";
import { useCookieValue } from "@/lib/useCookieValue";
import { claveContrataciones, fetchContrataciones } from "../services/contratacionesService";
import { Contratacion, ESTADOS_CONTRATACION, EstadoContratacion } from "../types/contratacion.types";
import { EstadoContratacionBadge, PuntosDeSeguimiento } from "./ContratacionBadges";
import { ContratacionDetalle } from "./ContratacionDetalle";

type Filtro = "todas" | EstadoContratacion;

export function ContratacionesView() {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [abierta, setAbierta] = useState<string | null>(null);
  const { toasts, mostrarToast } = useToast();
  const puedeEditar = useCookieValue("userRole") !== "Supervisor";

  // Se piden todas una vez y se filtran aquí: cambiar de filtro es instantáneo.
  const { datos, cargando, actualizando, error, recargar } = useCargaConCache<Contratacion[]>(claveContrataciones({}), () => fetchContrataciones());
  const { nombrePostulante, vacante } = useReferenciasSeleccion();

  const todas = useMemo(() => datos ?? [], [datos]);
  const visibles = useMemo(() => (filtro === "todas" ? todas : todas.filter((c) => c.estado === filtro)), [todas, filtro]);
  const conteo = useMemo(() => {
    const porEstado = (e: EstadoContratacion) => todas.filter((c) => c.estado === e).length;
    const vencidos = todas
      .filter((c) => c.estado === "Por ingresar" || c.estado === "Activo")
      .reduce((suma, c) => suma + c.seguimientos.filter((s) => s.vencido).length, 0);
    return { porIngresar: porEstado("Por ingresar"), activos: porEstado("Activo"), finalizados: porEstado("Finalizado"), vencidos };
  }, [todas]);

  const alCambiar = (mensaje: string, tipo: "success" | "error" = "success") => {
    mostrarToast(mensaje, tipo);
    if (tipo === "success") void recargar();
  };

  const tarjetas = [
    { titulo: "Por ingresar", valor: conteo.porIngresar, icono: Clock, color: "from-sky-500 to-cyan-400" },
    { titulo: "Activos", valor: conteo.activos, icono: UserCheck, color: "from-emerald-400 to-teal-500" },
    { titulo: "Controles vencidos", valor: conteo.vencidos, icono: AlertCircle, color: "from-rose-500 to-pink-400" },
    { titulo: "Finalizados", valor: conteo.finalizados, icono: BadgeCheck, color: "from-slate-400 to-slate-500" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Contrataciones</h1>
        <p className="mt-1 text-sm text-slate-500">Personas contratadas y su seguimiento post-ingreso (controles a los 30, 60 y 90 días).</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tarjetas.map(({ titulo, valor, icono: Icono, color }) => (
          <div key={titulo} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div>
              <p className="text-xs font-medium text-slate-500">{titulo}</p>
              {cargando ? <Skeleton className="mt-2 h-7 w-10" /> : <p className="text-2xl font-black text-slate-800">{valor}</p>}
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-md`}>
              <Icono size={20} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["todas", ...ESTADOS_CONTRATACION] as Filtro[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              filtro === f ? "bg-primary-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {f === "todas" ? "Todas" : f}
          </button>
        ))}
        {actualizando && <span className="text-xs text-slate-400">Actualizando…</span>}
      </div>

      {cargando ? (
        <div aria-hidden className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3.5 w-64 max-w-full" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : visibles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-slate-400">
          <BadgeCheck className="mx-auto mb-2 text-slate-300" size={32} />
          {todas.length === 0 ? "Todavía no hay contrataciones registradas." : "No hay contrataciones con ese estado."}
        </div>
      ) : (
        <ul className={`space-y-3 transition-opacity ${actualizando ? "opacity-60" : ""}`}>
          {visibles.map((c) => {
            const v = vacante(c.anuncioId);
            const etiqueta = `${v.cargo}${v.empresa ? ` · ${v.empresa}` : ""}`;
            const estaAbierta = abierta === c.id;
            return (
              <li key={c.id} className="rounded-xl border border-slate-100 bg-white shadow-sm">
                <button
                  onClick={() => setAbierta(estaAbierta ? null : c.id)}
                  aria-expanded={estaAbierta}
                  className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 p-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">{nombrePostulante(c.postulanteId)}</p>
                    <p className="truncate text-xs text-slate-500">
                      {c.cargo} · {etiqueta}
                    </p>
                  </div>
                  <div className="text-xs text-slate-500">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Ingreso</p>
                    {formatoFecha(c.fechaIngreso)}
                  </div>
                  <PuntosDeSeguimiento seguimientos={c.seguimientos} />
                  <EstadoContratacionBadge estado={c.estado} />
                  <ChevronDown size={18} className={`text-slate-400 transition-transform ${estaAbierta ? "rotate-180" : ""}`} />
                </button>
                {estaAbierta && (
                  <div className="space-y-4 border-t border-slate-100 p-4">
                    <ContratacionDetalle contratacion={c} etiquetaVacante={etiqueta} puedeEditar={puedeEditar} onCambio={alCambiar} />
                    <Link href={`/postulantes/${c.postulanteId}`} className="inline-block text-xs font-medium text-primary-600 hover:underline">
                      Ver ficha del postulante →
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
