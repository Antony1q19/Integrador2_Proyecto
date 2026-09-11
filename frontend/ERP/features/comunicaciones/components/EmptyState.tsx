// features/comunicaciones/components/EmptyState.tsx
"use client";

import { MessageCircle } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
        <MessageCircle className="h-10 w-10 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">
        Selecciona una conversación
      </h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Elige un contacto de la lista para ver los mensajes o iniciar una nueva
        conversación con un postulante.
      </p>
    </div>
  );
}