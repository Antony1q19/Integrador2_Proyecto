// features/postulantes/components/AgregarAAnuncioModal.tsx
//
// Ventana para agregar al postulante a un anuncio (crea su postulación en la
// etapa "Postulado"). Solo se ofrecen anuncios que no están cerrados y a los
// que todavía no postuló.
"use client";

import { useMemo, useState } from "react";
import { Anuncio } from "@/features/anuncios/types/anuncio";

interface AgregarAAnuncioModalProps {
  anuncios: Anuncio[];
  nombrePostulante?: string;
  onConfirmar: (anuncio: Anuncio) => Promise<void>;
  onCancelar: () => void;
}

export function AgregarAAnuncioModal({
  anuncios,
  nombrePostulante,
  onConfirmar,
  onCancelar,
}: AgregarAAnuncioModalProps) {
  const [busqueda, setBusqueda] = useState("");
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return anuncios;
    return anuncios.filter(
      (a) => a.cargo.toLowerCase().includes(texto) || a.empresaRazonSocial.toLowerCase().includes(texto)
    );
  }, [anuncios, busqueda]);

  const confirmar = async () => {
    const anuncio = anuncios.find((a) => a.id === seleccionadoId);
    if (!anuncio) return;
    setGuardando(true);
    setError(null);
    try {
      await onConfirmar(anuncio);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar al anuncio");
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !guardando && onCancelar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="agregar-anuncio-titulo"
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 id="agregar-anuncio-titulo" className="text-base font-semibold text-gray-900">
            Agregar a un anuncio
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {nombrePostulante ? `${nombrePostulante} quedará` : "El postulante quedará"} en la etapa
            &quot;Postulado&quot; del anuncio que elijas.
          </p>
        </div>

        <div className="px-5 pt-4">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cargo o empresa…"
            autoFocus
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
          />
        </div>

        <ul className="mt-3 flex-1 space-y-1.5 overflow-y-auto px-5 pb-2">
          {anuncios.length === 0 ? (
            <li className="py-6 text-center text-sm text-gray-400">
              No hay anuncios abiertos disponibles para este postulante.
            </li>
          ) : filtrados.length === 0 ? (
            <li className="py-6 text-center text-sm text-gray-400">Ningún anuncio coincide con la búsqueda.</li>
          ) : (
            filtrados.map((anuncio) => {
              const activo = anuncio.id === seleccionadoId;
              return (
                <li key={anuncio.id}>
                  <button
                    type="button"
                    onClick={() => setSeleccionadoId(anuncio.id)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      activo
                        ? "border-primary-600 bg-primary-50/60 ring-1 ring-primary-600"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-800">{anuncio.cargo}</span>
                      <span className="shrink-0 font-mono text-[11px] text-gray-400">
                        Cierra {new Date(anuncio.fechaLimite).toLocaleDateString("es-PE")}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {anuncio.empresaRazonSocial} · {anuncio.numeroVacantes}{" "}
                      {anuncio.numeroVacantes === 1 ? "vacante" : "vacantes"}
                    </p>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {error && <p className="px-5 pb-1 text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={onCancelar}
            disabled={guardando}
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirmar()}
            disabled={seleccionadoId === null || guardando}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {guardando ? "Agregando…" : "Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}
