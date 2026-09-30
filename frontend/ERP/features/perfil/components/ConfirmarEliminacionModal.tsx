// features/perfil/components/ConfirmarEliminacionModal.tsx
//
// Confirmación explícita antes de mandar a un trabajador a estado
// "Eliminado" (soft-delete: la cuenta deja de poder loguearse y de
// aparecer en este listado, ver GET /usuarios en el Gateway -no se borra
// la fila de la base de datos-).
"use client";

import { AlertTriangle, X } from "lucide-react";
import { Usuario } from "../types/usuario";

interface ConfirmarEliminacionModalProps {
  usuario: Usuario;
  eliminando: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function ConfirmarEliminacionModal({
  usuario,
  eliminando,
  onConfirmar,
  onCancelar,
}: ConfirmarEliminacionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50">
          <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
            <AlertTriangle size={20} /> Eliminar cuenta
          </h3>
          <button
            type="button"
            onClick={onCancelar}
            className="text-slate-400 hover:text-red-500 hover:bg-red-100 p-1 rounded-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700">
            ¿Eliminar la cuenta de <strong>{usuario.nombre}</strong> ({usuario.email})?
          </p>
          <p className="text-xs text-slate-500">
            No podrá volver a iniciar sesión y dejará de aparecer en esta lista. No se borra su
            historial.
          </p>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onCancelar}
              disabled={eliminando}
              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirmar}
              disabled={eliminando}
              className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 shadow-md shadow-red-200 transition-all disabled:opacity-60"
            >
              {eliminando ? "Eliminando..." : "Eliminar cuenta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
