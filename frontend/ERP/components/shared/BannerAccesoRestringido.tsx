"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { AlertCircle, X } from "lucide-react";

function BannerContenido() {
  const searchParams = useSearchParams();
  const motivo = searchParams.get("acceso_denegado");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (motivo) {
      setVisible(true);
    }
  }, [motivo]);

  if (!visible || !motivo) return null;

  const mensajes: Record<string, string> = {
    dashboard: "El módulo Dashboard está reservado para Administradores y Supervisores.",
    anuncios: "No tienes permisos suficientes para crear o modificar anuncios.",
    empresas: "No tienes permisos de administración para crear o modificar empresas clientes.",
  };

  const mensaje = mensajes[motivo] || "Acceso redirigido según los permisos asignados a tu rol.";

  return (
    <div className="mx-6 mt-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm transition-all">
      <div className="flex items-center gap-2">
        <AlertCircle size={18} className="text-amber-600 shrink-0" />
        <span>
          <strong className="font-semibold">Acceso restringido:</strong> {mensaje}
        </span>
      </div>
      <button
        onClick={() => setVisible(false)}
        aria-label="Cerrar aviso"
        className="rounded p-1 text-amber-600 hover:bg-amber-100 hover:text-amber-900 transition"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function BannerAccesoRestringido() {
  return (
    <Suspense fallback={null}>
      <BannerContenido />
    </Suspense>
  );
}
