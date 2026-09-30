// features/entrevistas/components/EntrevistasTab.tsx
//
// Pestaña "Entrevistas" de la ficha del postulante: sus entrevistas (las próximas primero), con opción de
// programar una nueva y de registrar cómo salió cada una.
"use client";

import { useMemo, useState } from "react";
import { CalendarClock, ExternalLink, MapPin, Phone, Plus, Video } from "lucide-react";
import { Skeleton } from "@/components/shared/Skeleton";
import { ToastContainer, useToast } from "@/components/shared/Toast";
import { useReferenciasSeleccion } from "@/features/postulantes/hooks/useReferenciasSeleccion";
import { useCookieValue } from "@/lib/useCookieValue";
import { useCargaConCache } from "@/lib/cacheCliente";
import { formatoFechaHora } from "@/lib/fechasLima";
import { claveEntrevistas, fetchEntrevistas } from "../services/entrevistasService";
import { Entrevista } from "../types/entrevista.types";
import { EntrevistaAcciones } from "./EntrevistaAcciones";
import { EntrevistaModal } from "./EntrevistaModal";
import { EstadoEntrevistaBadge, ResultadoEntrevistaBadge } from "./EntrevistaBadges";

const ICONO_MODALIDAD = { Virtual: Video, Presencial: MapPin, Telefónica: Phone };

// Si el "lugar o enlace" es un enlace, se muestra como enlace clicable; si no, como texto.
export function LugarOEnlace({ texto }: { texto: string }) {
  if (/^https?:\/\//i.test(texto)) {
    return (
      <a href={texto} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#1D2B53] underline-offset-2 hover:underline">
        Abrir enlace <ExternalLink size={12} />
      </a>
    );
  }
  return <span>{texto}</span>;
}

interface EntrevistasTabProps {
  postulanteId: string;
  onCambio: () => void; // programar o cerrar una entrevista puede cambiar la etapa del postulante: la ficha se refresca
}

export function EntrevistasTab({ postulanteId, onCambio }: EntrevistasTabProps) {
  const { datos, cargando, error, recargar } = useCargaConCache<Entrevista[]>(claveEntrevistas({ postulanteId }), () =>
    fetchEntrevistas({ postulanteId })
  );
  const { vacante } = useReferenciasSeleccion();
  const { toasts, mostrarToast } = useToast();
  const [programando, setProgramando] = useState(false);
  const puedeEditar = useCookieValue("userRole") !== "Supervisor";

  // Primero las próximas (por fecha), luego las cerradas (la más reciente arriba).
  const ordenadas = useMemo(() => {
    const lista = datos ?? [];
    const programadas = lista.filter((e) => e.estado === "Programada").sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
    const otras = lista.filter((e) => e.estado !== "Programada").sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
    return [...programadas, ...otras];
  }, [datos]);

  const alCambiar = (mensaje: string, tipo: "success" | "error" = "success") => {
    mostrarToast(mensaje, tipo);
    if (tipo === "success") {
      void recargar();
      onCambio();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {cargando ? "Cargando…" : `${ordenadas.length} ${ordenadas.length === 1 ? "entrevista" : "entrevistas"}`}
        </p>
        {puedeEditar && (
          <button
            onClick={() => setProgramando(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#1D2B53] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#16224A]"
          >
            <Plus size={15} /> Programar entrevista
          </button>
        )}
      </div>

      {cargando ? (
        <div aria-hidden className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3 rounded-lg border border-gray-100 p-4">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3.5 w-72" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="py-6 text-center text-sm text-red-500">{error}</p>
      ) : ordenadas.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          <CalendarClock className="mx-auto mb-2 text-gray-300" size={28} />
          Aún no hay entrevistas para este postulante.
        </p>
      ) : (
        <ul className="space-y-3">
          {ordenadas.map((e) => {
            const Icono = ICONO_MODALIDAD[e.modalidad];
            const v = vacante(e.anuncioId);
            return (
              <li key={e.id} className={`rounded-lg border p-4 ${e.estado === "Programada" ? "border-blue-100 bg-blue-50/30" : "border-gray-100"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold capitalize text-gray-800">{formatoFechaHora(e.fechaHora)}</p>
                    <p className="text-xs text-gray-500">
                      {v.cargo}
                      {v.empresa && ` · ${v.empresa}`} · {e.duracionMin} min
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
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
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {e.resultado && <ResultadoEntrevistaBadge resultado={e.resultado} />}
                    <EstadoEntrevistaBadge estado={e.estado} />
                  </div>
                </div>
                {e.notas && <p className="mt-3 rounded-md bg-white/70 px-3 py-2 text-sm text-gray-600">{e.notas}</p>}
                {puedeEditar && e.estado === "Programada" && (
                  <div className="mt-3 border-t border-blue-100 pt-3">
                    <EntrevistaAcciones entrevista={e} onCambio={alCambiar} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {programando && (
        <EntrevistaModal
          postulanteIdFijo={postulanteId}
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
