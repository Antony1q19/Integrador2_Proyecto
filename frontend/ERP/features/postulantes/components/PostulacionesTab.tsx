// features/postulantes/components/PostulacionesTab.tsx
//
// Muestra a qué anuncios/vacantes se presentó el postulante y el pipeline
// COMPLETO de cada postulación por separado: un mismo postulante puede
// estar en "Entrevista" para un anuncio y ya "Contratado" en otro al mismo
// tiempo, cada uno con su propia línea de tiempo e historial.
//
// Un anuncio se muestra si el postulante tiene una postulación a él (clave en
// `procesosPostulacion`, que en modo API viene de servicio-procesos-seleccion)
// o, en modo mock, si figura en `Anuncio.postulantesAsociadosIds`. Los datos del
// anuncio (cargo, empresa, fechas) se piden con `fetchAnuncios()`.
"use client";

import { useState } from "react";
import Link from "next/link";
import { Anuncio, EstadoAnuncio } from "@/features/anuncios/types/anuncio";
import { EstadoProceso, HistorialEstado, ProcesoPostulacion } from "../types/postulante.types";
import { fetchAnuncios, postularAAnuncio } from "../services/postulantesService";
import { AgregarAAnuncioModal } from "./AgregarAAnuncioModal";
import { EstadoBadge, ESTILOS_ESTADO } from "./EstadoBadge";
import { EstadoSelector } from "./EstadoSelector";
import { Timeline } from "./Timeline";
import { useToast, ToastContainer } from "@/components/shared/Toast";
import { ContratacionModal } from "@/features/contrataciones/components/ContratacionModal";
import { Skeleton } from "@/components/shared/Skeleton";
import ConfirmacionModal from "@/components/shared/ConfirmacionModal";
import { useCargaConCache } from "@/lib/cacheCliente";

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
  nombrePostulante?: string;
  // Se llama después de registrar una contratación (cambia la etapa de la postulación en el servidor).
  onContratado?: () => void;
  // Se llama después de agregarlo a un anuncio nuevo, para recargar sus postulaciones.
  onPostulado?: () => void | Promise<void>;
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
  nombrePostulante,
  onContratado,
  onPostulado,
}: PostulacionesTabProps) {
  const [agregando, setAgregando] = useState(false);
  const [contratando, setContratando] = useState<{ anuncioId: string; cargo: string } | null>(null);
  // Descartar pide confirmación antes (ver ConfirmacionModal al final).
  const [descartando, setDescartando] = useState<{ anuncioId: string; cargo: string } | null>(null);
  const [guardandoDescarte, setGuardandoDescarte] = useState(false);
  const { toasts, mostrarToast } = useToast();
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  // Los anuncios se recuerdan entre pantallas (ver lib/cacheCliente.ts): casi siempre ya están cargados.
  const { datos: anunciosCargados, cargando: cargandoAnuncios, error: errorAnuncios } = useCargaConCache<Anuncio[]>(
    "anuncios:lista",
    fetchAnuncios,
    30_000
  );
  const anuncios = anunciosCargados ?? [];

  const anunciosPostulados = anuncios.filter(
    (a) => a.postulantesAsociadosIds?.includes(postulanteId) || String(a.id) in procesosPostulacion
  );

  // Anuncios a los que se le puede agregar: no cerrados y a los que aún no postuló.
  // `anuncios` ya viene filtrado por el backend: RRHH y Supervisor solo reciben los
  // de las empresas que tienen asignadas (Admin ve todos).
  const anunciosDisponibles = anuncios.filter(
    (a) => a.estado !== "Cerrado" && !anunciosPostulados.some((p) => p.id === a.id)
  );

  const handleAgregarAAnuncio = async (anuncio: Anuncio) => {
    await postularAAnuncio(postulanteId, anuncio.id);
    setAgregando(false);
    mostrarToast(`Agregado al anuncio "${anuncio.cargo}" en la etapa "Postulado"`, "success");
    await onPostulado?.();
  };

  const botonAgregar = (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={() => setAgregando(true)}
        className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-primary-700"
      >
        + Agregar a un anuncio
      </button>
    </div>
  );

  const modalAgregar = agregando && (
    <AgregarAAnuncioModal
      anuncios={anunciosDisponibles}
      nombrePostulante={nombrePostulante}
      onConfirmar={handleAgregarAAnuncio}
      onCancelar={() => setAgregando(false)}
    />
  );

  const handleCambiarEstado = async (anuncioId: string, cargo: string, estado: EstadoProceso) => {
    try {
      await onActualizarEstado(anuncioId, estado, comentarios[anuncioId] || undefined);
      setComentarios((prev) => ({ ...prev, [anuncioId]: "" }));
      mostrarToast(`Postulación a "${cargo}" actualizada a "${ESTILOS_ESTADO[estado].label}"`, "success");
    } catch (err) {
      // El backend explica por qué rechaza un cambio (ej. "Primero revierte la decisión").
      mostrarToast(err instanceof Error ? err.message : "No se pudo actualizar la postulación. Intenta nuevamente.", "error");
    }
  };

  const handleDecisionFinal = async (anuncioId: string, cargo: string, estado: "CONTRATADO" | "DESCARTADO") => {
    if (estado === "CONTRATADO") {
      // Contratar pide los datos de la contratación (ingreso, tipo de contrato, salario): se abre su ventana.
      setContratando({ anuncioId, cargo });
      return;
    }
    setDescartando({ anuncioId, cargo });
  };

  const confirmarDescarte = async () => {
    if (!descartando) return;
    setGuardandoDescarte(true);
    await handleCambiarEstado(descartando.anuncioId, descartando.cargo, "DESCARTADO");
    setGuardandoDescarte(false);
    setDescartando(null);
  };

  const handleRevertir = async (anuncioId: string, cargo: string) => {
    try {
      await onActualizarEstado(anuncioId, "POSTULADO", "Se revirtió la decisión anterior");
      mostrarToast(`Se revirtió la decisión sobre la postulación a "${cargo}"`, "info");
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo revertir la decisión. Intenta nuevamente.", "error");
    }
  };

  if (cargandoAnuncios) {
    return (
      <div aria-hidden className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-4 rounded-lg border border-gray-100 p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (errorAnuncios) {
    return <p className="py-6 text-center text-sm text-red-500">{errorAnuncios}</p>;
  }

  if (anunciosPostulados.length === 0) {
    return (
      <div className="space-y-2">
        {botonAgregar}
        <p className="py-6 text-center text-sm text-gray-400">
          Este postulante aún no está asociado a ningún anuncio.
        </p>
        {modalAgregar}
        <ToastContainer toasts={toasts} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {botonAgregar}
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
                    className="text-sm font-medium text-gray-800 hover:text-primary-600 hover:underline"
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

              <div className="mt-4 flex flex-col gap-3 rounded-lg bg-slate-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
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
                    className="min-w-[220px] flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
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
                      className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Contratado
                    </button>
                    <button
                      onClick={() => handleDecisionFinal(anuncioId, anuncio.cargo, "DESCARTADO")}
                      disabled={guardando}
                      className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
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

      {contratando && (
        <ContratacionModal
          postulanteId={postulanteId}
          anuncioId={Number(contratando.anuncioId)}
          cargoSugerido={contratando.cargo}
          nombrePostulante={nombrePostulante}
          onCerrar={() => setContratando(null)}
          onGuardada={() => {
            setContratando(null);
            mostrarToast(`Contratación registrada: "${contratando.cargo}" pasó a "Contratado"`, "success");
            onContratado?.();
          }}
        />
      )}

      {descartando && (
        <ConfirmacionModal
          titulo="¿Descartar esta postulación?"
          mensaje={`La postulación a "${descartando.cargo}" pasará a "${ESTILOS_ESTADO.DESCARTADO.label}". Podrás revertirlo después.`}
          labelConfirmar="Descartar"
          labelConfirmando="Guardando…"
          confirmando={guardandoDescarte}
          onConfirmar={() => void confirmarDescarte()}
          onCancelar={() => setDescartando(null)}
        />
      )}

      {modalAgregar}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
