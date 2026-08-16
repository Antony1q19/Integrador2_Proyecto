// features/postulantes/components/EstadosTab.tsx
"use client";

import { useState } from "react";
import { EstadoProceso, HistorialEstado } from "../types/postulante.types";
import { EstadoBadge } from "./EstadoBadge";

const OPCIONES_ESTADO: { value: EstadoProceso; label: string }[] = [
  { value: "POSTULADO", label: "Postulado" },
  { value: "EN_EVALUACION", label: "En evaluación" },
  { value: "ENTREVISTA", label: "Entrevista" },
  { value: "PRESELECCIONADO", label: "Preseleccionado" },
  { value: "CONTRATADO", label: "Contratado" },
  { value: "DESCARTADO", label: "Descartado" },
];

interface EstadosTabProps {
  estadoActual: EstadoProceso;
  historial: HistorialEstado[];
  guardando: boolean;
  onCambiarEstado: (estado: EstadoProceso, comentario?: string) => Promise<void>;
}

export function EstadosTab({ estadoActual, historial, guardando, onCambiarEstado }: EstadosTabProps) {
  const [nuevoEstado, setNuevoEstado] = useState<EstadoProceso>(estadoActual);
  const [comentario, setComentario] = useState("");

  const handleCambiar = async () => {
    if (nuevoEstado === estadoActual) return;
    await onCambiarEstado(nuevoEstado, comentario || undefined);
    setComentario("");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-100 p-4">
        <p className="mb-3 text-xs font-medium text-gray-500">Cambiar estado del proceso</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={nuevoEstado}
            onChange={(e) => setNuevoEstado(e.target.value as EstadoProceso)}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-[#1D2B53] focus:outline-none focus:ring-1 focus:ring-[#1D2B53]"
          >
            {OPCIONES_ESTADO.map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
          <input
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Comentario (opcional)"
            className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-[#1D2B53] focus:outline-none focus:ring-1 focus:ring-[#1D2B53]"
          />
          <button
            onClick={handleCambiar}
            disabled={guardando || nuevoEstado === estadoActual}
            className="rounded-md bg-[#1D2B53] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#16224A] disabled:opacity-40"
          >
            {guardando ? "Guardando…" : "Aplicar cambio"}
          </button>
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-medium text-gray-500">Historial de cambios</p>
        <ol className="space-y-0">
          {[...historial].reverse().map((h, i) => (
            <li key={h.id} className="relative flex gap-3 pb-5 pl-1 last:pb-0">
              {i !== historial.length - 1 && (
                <span className="absolute left-[7px] top-4 h-full w-px bg-gray-100" />
              )}
              <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-[#1D2B53] bg-white" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <EstadoBadge estado={h.estado} />
                  <span className="font-mono text-[11px] text-gray-400">
                    {new Date(h.fecha).toLocaleString("es-PE")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Registrado por {h.usuarioResponsable}
                  {h.comentario && ` — "${h.comentario}"`}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
