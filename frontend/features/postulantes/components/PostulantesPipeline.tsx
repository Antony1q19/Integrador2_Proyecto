// features/postulantes/components/PostulantesPipeline.tsx
//
// Vista Kanban del pipeline de selección (HU-09). Agrupa a los postulantes
// por estado en columnas y permite arrastrarlos entre columnas para cambiar
// su estado, con confirmación visual (toast) al soltar.
"use client";

import { useState } from "react";
import Link from "next/link";
import { EstadoProceso, Postulante } from "../types/postulante.types";
import { ESTILOS_ESTADO } from "./EstadoBadge";
import { OPCIONES_ESTADO } from "./EstadoSelector";
import { usePostulantesPipeline } from "../hooks/usePostulantesPipeline";
import { useToast, ToastContainer } from "@/components/shared/Toast";

function iniciales(nombres: string, apellidos: string) {
  return `${nombres[0] ?? ""}${apellidos[0] ?? ""}`.toUpperCase();
}

export function PostulantesPipeline() {
  const { postulantes, loading, error, moviendoId, moverEstado } = usePostulantesPipeline();
  const { toasts, mostrarToast } = useToast();
  const [columnaSobre, setColumnaSobre] = useState<EstadoProceso | null>(null);

  const handleDrop = async (postulante: Postulante, estadoDestino: EstadoProceso) => {
    setColumnaSobre(null);
    if (postulante.estadoActual === estadoDestino) return;
    try {
      await moverEstado(postulante.id, estadoDestino);
      mostrarToast(
        `${postulante.datosPersonales.nombres} ${postulante.datosPersonales.apellidos} pasó a "${ESTILOS_ESTADO[estadoDestino].label}"`,
        "success"
      );
    } catch {
      mostrarToast("No se pudo actualizar el estado. Intenta nuevamente.", "error");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl animate-pulse space-y-4 p-6">
        <div className="h-8 w-64 rounded-lg bg-gray-100" />
        <div className="flex gap-4">
          {OPCIONES_ESTADO.map((op) => (
            <div key={op.value} className="h-96 w-64 shrink-0 rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Pipeline de selección</h1>
        <p className="text-sm text-gray-500">
          Arrastra a un postulante entre columnas para cambiar su estado del proceso. Las
          decisiones finales (Contratado / Descartado) se registran desde la ficha del postulante.
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {OPCIONES_ESTADO.map((op) => {
          const postulantesColumna = postulantes.filter((p) => p.estadoActual === op.value);

          return (
            <div
              key={op.value}
              onDragOver={(e) => {
                e.preventDefault();
                setColumnaSobre(op.value);
              }}
              onDragLeave={() => setColumnaSobre((prev) => (prev === op.value ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                const postulante = postulantes.find((p) => p.id === id);
                if (postulante) handleDrop(postulante, op.value);
              }}
              className={`flex w-64 shrink-0 flex-col gap-3 rounded-xl border p-3 transition-colors ${
                columnaSobre === op.value
                  ? "border-[#1D2B53] bg-[#1D2B53]/5"
                  : "border-transparent bg-slate-50/60"
              }`}
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-gray-700">{op.label}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-400">
                  {postulantesColumna.length}
                </span>
              </div>

              <div className="flex min-h-[60px] flex-col gap-2">
                {postulantesColumna.map((p) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
                    className={`cursor-grab rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition-opacity hover:border-gray-200 active:cursor-grabbing ${
                      moviendoId === p.id ? "opacity-50" : ""
                    }`}
                  >
                    <Link href={`/postulantes/${p.id}`} className="block">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1D2B53] text-[10px] font-semibold text-white">
                          {iniciales(p.datosPersonales.nombres, p.datosPersonales.apellidos)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800">
                            {p.datosPersonales.nombres} {p.datosPersonales.apellidos}
                          </p>
                          <p className="truncate text-xs text-gray-500">{p.datosPersonales.cargoPostulado}</p>
                        </div>
                      </div>
                      <p className="mt-2 truncate text-[11px] text-gray-400">
                        {p.datosPersonales.empresaCliente}
                      </p>
                    </Link>
                  </div>
                ))}

                {postulantesColumna.length === 0 && (
                  <p className="rounded-lg border border-dashed border-gray-200 py-4 text-center text-[11px] text-gray-300">
                    Sin postulantes
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
