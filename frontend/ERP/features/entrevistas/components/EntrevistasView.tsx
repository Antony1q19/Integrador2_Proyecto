// features/entrevistas/components/EntrevistasView.tsx
//
// Agenda de entrevistas: todas las entrevistas que la persona puede ver (según las empresas que tiene asignadas),
// agrupadas por día, con filtros rápidos y las acciones de cada una.
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, MapPin, Phone, Plus, Video } from "lucide-react";
import { Skeleton } from "@/components/shared/Skeleton";
import { ToastContainer, useToast } from "@/components/shared/Toast";
import { useReferenciasSeleccion } from "@/features/postulantes/hooks/useReferenciasSeleccion";
import { useCargaConCache } from "@/lib/cacheCliente";
import { formatoDia, formatoHora, hoyEnLima, sumarDiasATexto } from "@/lib/fechasLima";
import { useCookieValue } from "@/lib/useCookieValue";
import { claveEntrevistas, fetchEntrevistas } from "../services/entrevistasService";
import { Entrevista, FiltrosEntrevistas } from "../types/entrevista.types";
import { EntrevistaAcciones } from "./EntrevistaAcciones";
import { EntrevistaModal } from "./EntrevistaModal";
import { EstadoEntrevistaBadge, ResultadoEntrevistaBadge } from "./EntrevistaBadges";
import { LugarOEnlace } from "./EntrevistasTab";

type Vista = "proximas" | "semana" | "realizadas" | "todas";

const VISTAS: { id: Vista; etiqueta: string }[] = [
  { id: "proximas", etiqueta: "Próximas" },
  { id: "semana", etiqueta: "Próximos 7 días" },
  { id: "realizadas", etiqueta: "Realizadas" },
  { id: "todas", etiqueta: "Todas" },
];

function filtrosDeVista(vista: Vista, hoy: string): FiltrosEntrevistas {
  switch (vista) {
    case "proximas":
      return { estado: "Programada", desde: hoy };
    case "semana":
      return { estado: "Programada", desde: hoy, hasta: sumarDiasATexto(hoy, 6) };
    case "realizadas":
      return { estado: "Realizada" };
    default:
      return {};
  }
}

const ICONO_MODALIDAD = { Virtual: Video, Presencial: MapPin, Telefónica: Phone };

export function EntrevistasView() {
  const [vista, setVista] = useState<Vista>("proximas");
  const [programando, setProgramando] = useState(false);
  const { toasts, mostrarToast } = useToast();
  const puedeEditar = useCookieValue("userRole") !== "Supervisor";

  const filtros = useMemo(() => filtrosDeVista(vista, hoyEnLima()), [vista]);
  const { datos, cargando, actualizando, error, recargar } = useCargaConCache<Entrevista[]>(
    claveEntrevistas(filtros),
    () => fetchEntrevistas(filtros)
  );
  const { nombrePostulante, vacante } = useReferenciasSeleccion();

  // Agrupadas por día: las que vienen primero las más próximas; en "Realizadas" y "Todas", las más recientes arriba.
  const grupos = useMemo(() => {
    const lista = [...(datos ?? [])].sort((a, b) =>
      vista === "proximas" || vista === "semana" ? a.fechaHora.localeCompare(b.fechaHora) : b.fechaHora.localeCompare(a.fechaHora)
    );
    const porDia = new Map<string, Entrevista[]>();
    for (const e of lista) {
      const dia = formatoDia(e.fechaHora);
      porDia.set(dia, [...(porDia.get(dia) ?? []), e]);
    }
    return [...porDia.entries()];
  }, [datos, vista]);

  const alCambiar = (mensaje: string, tipo: "success" | "error" = "success") => {
    mostrarToast(mensaje, tipo);
    if (tipo === "success") void recargar();
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Entrevistas</h1>
          <p className="mt-1 text-sm text-slate-500">Agenda de entrevistas de los procesos de selección (hora de Perú).</p>
        </div>
        {puedeEditar && (
          <button
            onClick={() => setProgramando(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1D2B53] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#16224A]"
          >
            <Plus size={16} /> Programar entrevista
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            onClick={() => setVista(v.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              vista === v.id ? "bg-[#1D2B53] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {v.etiqueta}
          </button>
        ))}
        {actualizando && <span className="text-xs text-slate-400">Actualizando…</span>}
      </div>

      {cargando ? (
        <div aria-hidden className="space-y-6">
          {[1, 2].map((g) => (
            <div key={g} className="space-y-3">
              <Skeleton className="h-4 w-48" />
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <Skeleton className="h-12 w-16" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-3.5 w-72 max-w-full" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : grupos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-slate-400">
          <CalendarClock className="mx-auto mb-2 text-slate-300" size={32} />
          No hay entrevistas en esta vista.
        </div>
      ) : (
        <div className={`space-y-6 transition-opacity ${actualizando ? "opacity-60" : ""}`}>
          {grupos.map(([dia, entrevistas]) => (
            <section key={dia}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                {dia} · {entrevistas.length}
              </h2>
              <ul className="space-y-2">
                {entrevistas.map((e) => {
                  const Icono = ICONO_MODALIDAD[e.modalidad];
                  const v = vacante(e.anuncioId);
                  return (
                    <li key={e.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-start gap-4">
                        <div className="w-20 shrink-0 text-center">
                          <p className="text-lg font-bold text-slate-800">{formatoHora(e.fechaHora)}</p>
                          <p className="text-[11px] text-slate-400">{e.duracionMin} min</p>
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <Link href={`/postulantes/${e.postulanteId}`} className="text-sm font-semibold text-slate-800 hover:text-[#1D2B53] hover:underline">
                            {nombrePostulante(e.postulanteId)}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {v.cargo}
                            {v.empresa && ` · ${v.empresa}`}
                          </p>
                          <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Icono size={13} /> {e.modalidad}
                            </span>
                            {e.lugarOEnlace && (
                              <span>
                                · <LugarOEnlace texto={e.lugarOEnlace} />
                              </span>
                            )}
                            <span>· Entrevista: {e.entrevistador}</span>
                          </p>
                          {e.notas && <p className="text-xs italic text-slate-400">{e.notas}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            {e.resultado && <ResultadoEntrevistaBadge resultado={e.resultado} />}
                            <EstadoEntrevistaBadge estado={e.estado} />
                          </div>
                          {puedeEditar && <EntrevistaAcciones entrevista={e} onCambio={alCambiar} />}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {programando && (
        <EntrevistaModal
          onCerrar={() => setProgramando(false)}
          onGuardada={() => {
            setProgramando(false);
            alCambiar("Entrevista programada");
          }}
        />
      )}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
