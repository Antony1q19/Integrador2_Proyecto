// features/comunicaciones/components/NotificacionToast.tsx
"use client";

import { useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { NotificacionMensaje } from "../types/notificaciones.types";

interface NotificacionToastProps {
  notificacion: NotificacionMensaje;
  onClose: () => void;
  onClick: () => void;
}

export function NotificacionToast({
  notificacion,
  onClose,
  onClick,
}: NotificacionToastProps) {
  return (
    <div
      onClick={onClick}
      className="pointer-events-auto flex w-80 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg transition-all hover:shadow-xl animate-in slide-in-from-right duration-300"
    >
      {/* Icono */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100">
        <MessageCircle className="h-5 w-5 text-indigo-600" />
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">
          {notificacion.contactoNombre}
        </p>
        <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
          {notificacion.texto}
        </p>
      </div>

      {/* Botón cerrar */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}