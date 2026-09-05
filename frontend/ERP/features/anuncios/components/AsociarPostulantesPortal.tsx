"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Postulante } from "@/features/postulantes/types/postulante.types";

interface AsociarPostulantesModalProps {
  postulantesDisponibles: Postulante[];
  idsSeleccionados: string[];
  onConfirmar: (nuevosIds: string[]) => void;
  onCerrar: () => void;
}

// El portal solo puede crearse en el navegador (document existe), nunca durante el
// renderizado en servidor. useSyncExternalStore con snapshots fijos (true en cliente,
// false en servidor) resuelve esto sin useEffect + setState, evitando el render en
// cascada que señala react-hooks/set-state-in-effect.
function subscribe() {
  return () => {};
}
function getSnapshot() {
  return true;
}
function getServerSnapshot() {
  return false;
}

export default function AsociarPostulantesModal({
  postulantesDisponibles,
  idsSeleccionados,
  onConfirmar,
  onCerrar,
}: AsociarPostulantesModalProps) {
  const montado = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [seleccionTemporal, setSeleccionTemporal] =
    useState<string[]>(idsSeleccionados);

  // Cerrar con la tecla Escape
  useEffect(() => {
    function manejarEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    document.addEventListener("keydown", manejarEscape);
    return () => document.removeEventListener("keydown", manejarEscape);
  }, [onCerrar]);

  if (!montado) return null;

  const toggleSeleccion = (postulanteId: string) => {
    setSeleccionTemporal((prev) =>
      prev.includes(postulanteId)
        ? prev.filter((id) => id !== postulanteId)
        : [...prev, postulanteId]
    );
  };

  const contenidoModal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl flex flex-col"
      >
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Asociar Postulantes
          </h2>
          <p className="text-sm text-slate-500">
            Selecciona los postulantes existentes para esta vacante
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {postulantesDisponibles.length === 0 && (
            <p className="py-4 text-sm text-slate-400">
              No hay postulantes registrados aún.
            </p>
          )}

          {postulantesDisponibles.map((postulante) => (
            <label
              key={postulante.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={seleccionTemporal.includes(postulante.id)}
                onChange={() => toggleSeleccion(postulante.id)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
              />
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {postulante.datosPersonales.nombres}{" "}
                  {postulante.datosPersonales.apellidos}
                </p>
                <p className="text-xs text-slate-400">
                  {postulante.datosPersonales.cargoPostulado}
                </p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirmar(seleccionTemporal)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Confirmar ({seleccionTemporal.length})
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(contenidoModal, document.body);
}
