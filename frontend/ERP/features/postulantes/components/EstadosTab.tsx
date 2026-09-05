// features/postulantes/components/EstadosTab.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { EstadoProceso, HistorialEstado } from "../types/postulante.types";
import { EstadoBadge, ESTILOS_ESTADO } from "./EstadoBadge";
import { EstadoSelector } from "./EstadoSelector";
import { useToast, ToastContainer } from "@/components/shared/Toast";

interface EstadosTabProps {
  estadoActual: EstadoProceso;
  historial: HistorialEstado[];
  guardando: boolean;
  onCambiarEstado: (estado: EstadoProceso, comentario?: string) => Promise<void>;
}

export function EstadosTab({ estadoActual, historial, guardando, onCambiarEstado }: EstadosTabProps) {
  const [comentario, setComentario] = useState("");
  const { toasts, mostrarToast } = useToast();

  const handleSeleccionar = async (estado: EstadoProceso) => {
    try {
      await onCambiarEstado(estado, comentario || undefined);
      setComentario("");
      mostrarToast(`Estado actualizado a "${ESTILOS_ESTADO[estado].label}"`, "success");
    } catch {
      mostrarToast("No se pudo actualizar el estado. Intenta nuevamente.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-100 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500">Cambiar estado del proceso</p>
          <Link href="/postulantes/pipeline" className="text-xs font-medium text-[#1D2B53] hover:underline">
            Ver vista Kanban →
          </Link>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <EstadoSelector estadoActual={estadoActual} disabled={guardando} onSeleccionar={handleSeleccionar} />
          <input
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Comentario (opcional, se aplica al próximo cambio)"
            className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-[#1D2B53] focus:outline-none focus:ring-1 focus:ring-[#1D2B53]"
          />
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

      <ToastContainer toasts={toasts} />
    </div>
  );
}
