// components/shared/Toast.tsx
//
// Sistema de notificaciones toast minimalista, sin dependencias externas.
// Cada pantalla que necesite confirmar una acción usa el hook `useToast()`
// y renderiza `<ToastContainer toasts={toasts} />` una vez en su árbol.
"use client";

import { useCallback, useState } from "react";

export type ToastVariante = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  mensaje: string;
  variante: ToastVariante;
}

const ESTILOS_VARIANTE: Record<ToastVariante, string> = {
  success: "border-emerald-100 bg-emerald-50 text-emerald-700",
  error: "border-red-100 bg-red-50 text-red-700",
  info: "border-slate-200 bg-white text-slate-700",
};

const DURACION_MS = 3500;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const mostrarToast = useCallback((mensaje: string, variante: ToastVariante = "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, mensaje, variante }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, DURACION_MS);
  }, []);

  return { toasts, mostrarToast };
}

export function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-72 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`rounded-lg border px-4 py-2.5 text-sm shadow-md ${ESTILOS_VARIANTE[t.variante]}`}
        >
          {t.mensaje}
        </div>
      ))}
    </div>
  );
}
