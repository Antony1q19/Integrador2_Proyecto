// features/postulantes/components/PostulacionesTab.tsx
//
// Muestra a qué anuncios/vacantes está asociado el postulante (relación
// definida en `Anuncio.postulantesAsociadosIds`, la misma que gestiona
// PostulantesAsociados.tsx desde el lado del anuncio) y permite decidir el
// desenlace de CADA postulación por separado: un mismo postulante puede
// estar contratado en un anuncio y descartado (o aún en proceso) en otro.
"use client";

import Link from "next/link";
import { anunciosMock } from "@/features/anuncios/data/mock-anuncios";
import { EstadoAnuncio } from "@/features/anuncios/types/anuncio";
import { ResultadoPostulacion } from "../types/postulante.types";
import { useToast, ToastContainer } from "@/components/shared/Toast";

const ESTILOS_ESTADO_ANUNCIO: Record<EstadoAnuncio, string> = {
  Abierto: "bg-emerald-50 text-emerald-700",
  "En proceso": "bg-amber-50 text-amber-700",
  Cerrado: "bg-gray-100 text-gray-500",
};

const ESTILOS_RESULTADO: Record<ResultadoPostulacion, string> = {
  CONTRATADO: "bg-emerald-600 text-white",
  DESCARTADO: "bg-red-600 text-white",
};

const ETIQUETAS_RESULTADO: Record<ResultadoPostulacion, string> = {
  CONTRATADO: "Contratado",
  DESCARTADO: "Descartado",
};

interface PostulacionesTabProps {
  postulanteId: string;
  resultadosPostulacion: Record<string, ResultadoPostulacion>;
  guardando: boolean;
  onActualizarResultado: (anuncioId: string, resultado: ResultadoPostulacion | null) => Promise<void>;
}

export function PostulacionesTab({
  postulanteId,
  resultadosPostulacion,
  guardando,
  onActualizarResultado,
}: PostulacionesTabProps) {
  const { toasts, mostrarToast } = useToast();

  const anunciosPostulados = anunciosMock.filter((a) =>
    a.postulantesAsociadosIds.includes(postulanteId)
  );

  const handleDecision = async (anuncioId: string, cargo: string, resultado: ResultadoPostulacion) => {
    const confirmado = window.confirm(
      `¿Confirmas marcar la postulación a "${cargo}" como "${ETIQUETAS_RESULTADO[resultado]}"?`
    );
    if (!confirmado) return;
    try {
      await onActualizarResultado(anuncioId, resultado);
      mostrarToast(`Postulación a "${cargo}" marcada como "${ETIQUETAS_RESULTADO[resultado]}"`, "success");
    } catch {
      mostrarToast("No se pudo actualizar la postulación. Intenta nuevamente.", "error");
    }
  };

  const handleRevertir = async (anuncioId: string, cargo: string) => {
    try {
      await onActualizarResultado(anuncioId, null);
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
    <div className="space-y-3">
      <ul className="space-y-3">
        {anunciosPostulados.map((anuncio) => {
          const anuncioId = String(anuncio.id);
          const resultado = resultadosPostulacion[anuncioId];

          return (
            <li key={anuncio.id} className="rounded-lg border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3">
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

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {resultado ? (
                    <>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTILOS_RESULTADO[resultado]}`}
                      >
                        {ETIQUETAS_RESULTADO[resultado]}
                      </span>
                      <button
                        onClick={() => handleRevertir(anuncioId, anuncio.cargo)}
                        disabled={guardando}
                        className="text-[11px] text-gray-400 underline hover:text-gray-600 disabled:opacity-50"
                      >
                        Revertir decisión
                      </button>
                    </>
                  ) : (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleDecision(anuncioId, anuncio.cargo, "CONTRATADO")}
                        disabled={guardando}
                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Contratado
                      </button>
                      <button
                        onClick={() => handleDecision(anuncioId, anuncio.cargo, "DESCARTADO")}
                        disabled={guardando}
                        className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Descartado
                      </button>
                    </div>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${ESTILOS_ESTADO_ANUNCIO[anuncio.estado]}`}
                    title="Estado del anuncio"
                  >
                    {anuncio.estado}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
