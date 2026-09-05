// features/postulantes/components/PostulacionesTab.tsx
//
// Muestra a qué anuncios/vacantes está asociado el postulante (relación
// definida en `Anuncio.postulantesAsociadosIds`, la misma que gestiona
// PostulantesAsociados.tsx desde el lado del anuncio) y el pipeline
// COMPLETO de cada postulación por separado: un mismo postulante puede
// estar en "Entrevista" para un anuncio y ya "Contratado" en otro al mismo
// tiempo, cada uno con su propia línea de tiempo e historial.
"use client";

import { useState } from "react";
import Link from "next/link";
import { anunciosMock } from "@/features/anuncios/data/mock-anuncios";
import { EstadoAnuncio } from "@/features/anuncios/types/anuncio";
import { EstadoProceso, HistorialEstado, ProcesoPostulacion } from "../types/postulante.types";
import { EstadoBadge, ESTILOS_ESTADO } from "./EstadoBadge";
import { EstadoSelector } from "./EstadoSelector";
import { Timeline } from "./Timeline";
import { useToast, ToastContainer } from "@/components/shared/Toast";

const ESTILOS_ESTADO_ANUNCIO: Record<EstadoAnuncio, string> = {
  Abierto: "bg-emerald-50 text-emerald-700",
  "En proceso": "bg-amber-50 text-amber-700",
  Cerrado: "bg-gray-100 text-gray-500",
};

const PROCESO_INICIAL: ProcesoPostulacion = { estadoActual: "POSTULADO", historialEstados: [] };

interface PostulacionesTabProps {
  postulanteId: string;
  procesosPostulacion: Record<string, ProcesoPostulacion>;
  guardando: boolean;
  onActualizarEstado: (anuncioId: string, estado: EstadoProceso, comentario?: string) => Promise<void>;
}

function HistorialPostulacion({ historial }: { historial: HistorialEstado[] }) {
  if (historial.length === 0) return null;
  return (
    <ul className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
      {[...historial].reverse().map((h) => (
        <li key={h.id} className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <EstadoBadge estado={h.estado} />
          <span className="font-mono text-[11px] text-gray-400">
            {new Date(h.fecha).toLocaleString("es-PE")}
          </span>
          <span>· {h.usuarioResponsable}</span>
          {h.comentario && <span className="text-gray-400">— &quot;{h.comentario}&quot;</span>}
        </li>
      ))}
    </ul>
  );
}

export function PostulacionesTab({
  postulanteId,
  procesosPostulacion,
  guardando,
  onActualizarEstado,
}: PostulacionesTabProps) {
  const { toasts, mostrarToast } = useToast();
  const [comentarios, setComentarios] = useState<Record<string, string>>({});

  const anunciosPostulados = anunciosMock.filter((a) =>
    a.postulantesAsociadosIds.includes(postulanteId)
  );

  const handleCambiarEstado = async (anuncioId: string, cargo: string, estado: EstadoProceso) => {
    try {
      await onActualizarEstado(anuncioId, estado, comentarios[anuncioId] || undefined);
      setComentarios((prev) => ({ ...prev, [anuncioId]: "" }));
      mostrarToast(`Postulación a "${cargo}" actualizada a "${ESTILOS_ESTADO[estado].label}"`, "success");
    } catch {
      mostrarToast("No se pudo actualizar la postulación. Intenta nuevamente.", "error");
    }
  };

  const handleDecisionFinal = async (anuncioId: string, cargo: string, estado: "CONTRATADO" | "DESCARTADO") => {
    const confirmado = window.confirm(
      `¿Confirmas marcar la postulación a "${cargo}" como "${ESTILOS_ESTADO[estado].label}"?`
    );
    if (!confirmado) return;
    await handleCambiarEstado(anuncioId, cargo, estado);
  };

  const handleRevertir = async (anuncioId: string, cargo: string) => {
    try {
      await onActualizarEstado(anuncioId, "POSTULADO", "Se revirtió la decisión anterior");
      mostrarToast(`Se revirtió la decisión sobre la postulación a "${cargo}"`, "info");
    } catch {
      mostrarToast("No se pudo revertir la decisión. Intenta nuevamente.", "error");
    }
  };

  if (anunciosPostulados.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-400">
        Este postulante aún no está asociado a ningún anuncio.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {anunciosPostulados.map((anuncio) => {
          const anuncioId = String(anuncio.id);
          const proceso = procesosPostulacion[anuncioId] ?? PROCESO_INICIAL;
          const esFinal = proceso.estadoActual === "CONTRATADO" || proceso.estadoActual === "DESCARTADO";

          return (
            <li key={anuncio.id} className="rounded-lg border border-gray-100 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/anuncios/${anuncio.id}`}
                    className="text-sm font-medium text-gray-800 hover:text-[#1D2B53] hover:underline"
                  >
                    {anuncio.cargo}
                  </Link>
                  <p className="text-sm text-gray-500">{anuncio.empresaRazonSocial}</p>
                  <p className="mt-1 font-mono text-[11px] text-gray-400">
                    Publicado {new Date(anuncio.fechaCreacion).toLocaleDateString("es-PE")} · Cierra{" "}
                    {new Date(anuncio.fechaLimite).toLocaleDateString("es-PE")}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${ESTILOS_ESTADO_ANUNCIO[anuncio.estado]}`}
                  title="Estado del anuncio"
                >
                  {anuncio.estado}
                </span>
              </div>

              <div className="mt-4 border-t border-gray-100 pt-4">
                <Timeline estadoActual={proceso.estadoActual} />
              </div>

              <div className="mt-4 flex flex-col gap-3 rounded-md bg-slate-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <EstadoSelector
                    estadoActual={proceso.estadoActual}
                    disabled={guardando}
                    onSeleccionar={(estado) => handleCambiarEstado(anuncioId, anuncio.cargo, estado)}
                  />
                  <input
                    value={comentarios[anuncioId] ?? ""}
                    onChange={(e) => setComentarios((prev) => ({ ...prev, [anuncioId]: e.target.value }))}
                    placeholder="Comentario (opcional, se aplica al próximo cambio)"
                    className="min-w-[220px] flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-[#1D2B53] focus:outline-none focus:ring-1 focus:ring-[#1D2B53]"
                  />
                </div>

                {esFinal ? (
                  <button
                    onClick={() => handleRevertir(anuncioId, anuncio.cargo)}
                    disabled={guardando}
                    className="shrink-0 text-xs text-gray-400 underline hover:text-gray-600 disabled:opacity-50"
                  >
                    Revertir decisión
                  </button>
                ) : (
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      onClick={() => handleDecisionFinal(anuncioId, anuncio.cargo, "CONTRATADO")}
                      disabled={guardando}
                      className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Contratado
                    </button>
                    <button
                      onClick={() => handleDecisionFinal(anuncioId, anuncio.cargo, "DESCARTADO")}
                      disabled={guardando}
                      className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Descartado
                    </button>
                  </div>
                )}
              </div>

              <HistorialPostulacion historial={proceso.historialEstados} />
            </li>
          );
        })}
      </ul>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
