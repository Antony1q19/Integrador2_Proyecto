// components/shared/Modal.tsx
//
// Ventana emergente (modal) reutilizable: fondo oscuro, título, botón de cerrar (X) y tecla Escape.
// El contenido y los botones los pone quien la usa. Se cierra al hacer clic en el fondo, salvo que
// `bloqueado` sea true (por ejemplo, mientras se está guardando).
"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  titulo: string;
  subtitulo?: string;
  onCerrar: () => void;
  bloqueado?: boolean;
  ancho?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const ANCHOS = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

export function Modal({ titulo, subtitulo, onCerrar, bloqueado = false, ancho = "md", children }: ModalProps) {
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !bloqueado) onCerrar();
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [onCerrar, bloqueado]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => !bloqueado && onCerrar()}
    >
      <div
        role="dialog"
        aria-label={titulo}
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-xl bg-white shadow-2xl ${ANCHOS[ancho]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">{titulo}</h3>
            {subtitulo && <p className="mt-0.5 text-xs text-slate-500">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={bloqueado}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

// Estilos comunes de los campos de los formularios dentro de los modales.
export const ESTILO_CAMPO =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/15 disabled:bg-slate-50 disabled:text-slate-400";

export function Campo({ etiqueta, obligatorio, ayuda, children }: { etiqueta: string; obligatorio?: boolean; ayuda?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">
        {etiqueta} {obligatorio && <span className="text-red-500">*</span>}
      </span>
      {children}
      {ayuda && <span className="mt-1 block text-[11px] text-slate-400">{ayuda}</span>}
    </label>
  );
}

// Botones del pie de un formulario en un modal.
export function BotonesModal({ guardando, textoGuardar, onCancelar }: { guardando: boolean; textoGuardar: string; onCancelar: () => void }) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onCancelar}
        disabled={guardando}
        className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={guardando}
        className="flex-1 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-primary-700 disabled:opacity-60"
      >
        {guardando ? "Guardando…" : textoGuardar}
      </button>
    </div>
  );
}
