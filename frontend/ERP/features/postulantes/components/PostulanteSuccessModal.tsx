// features/postulantes/components/PostulanteSuccessModal.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, X } from "lucide-react";

interface PostulanteSuccessModalProps {
  isOpen: boolean;
  postulanteId: string | null;
}

export function PostulanteSuccessModal({
  isOpen,
  postulanteId,
}: PostulanteSuccessModalProps) {
  const router = useRouter();

  // Redirigir automáticamente después de 3 segundos
  useEffect(() => {
    if (isOpen && postulanteId) {
      const timer = setTimeout(() => {
        router.push(`/postulantes/${postulanteId}`);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, postulanteId, router]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl animate-in fade-in zoom-in duration-300">
        {/* Botón cerrar */}
        <button
          onClick={() => router.push("/postulantes")}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icono de éxito */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>

        <h3 className="text-xl font-bold text-slate-900">
          ¡Postulante registrado con éxito!
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          El postulante ha sido incorporado al sistema correctamente.
          {postulanteId && (
            <span className="block mt-1 text-xs text-slate-400">
              ID: {postulanteId}
            </span>
          )}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => router.push(`/postulantes/${postulanteId}`)}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Ver ficha del postulante
          </button>
          <button
            onClick={() => router.push("/postulantes")}
            className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Ir al listado
          </button>
        </div>
      </div>
    </div>
  );
}