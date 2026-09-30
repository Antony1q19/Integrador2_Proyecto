"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ConfirmacionModalProps {
  titulo: string;
  mensaje: string;
  labelConfirmar?: string;
  labelCancelar?: string;
  confirmando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export default function ConfirmacionModal({
  titulo,
  mensaje,
  labelConfirmar = "Eliminar",
  labelCancelar = "Cancelar",
  confirmando = false,
  onConfirmar,
  onCancelar,
}: ConfirmacionModalProps) {
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    function manejarEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onCancelar();
    }
    document.addEventListener("keydown", manejarEscape);
    return () => document.removeEventListener("keydown", manejarEscape);
  }, [onCancelar]);

  if (!montado) return null;

  const contenido = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onCancelar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
        <p className="mt-2 text-sm text-slate-600">{mensaje}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            disabled={confirmando}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {labelCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={confirmando}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirmando ? "Eliminando..." : labelConfirmar}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(contenido, document.body);
}