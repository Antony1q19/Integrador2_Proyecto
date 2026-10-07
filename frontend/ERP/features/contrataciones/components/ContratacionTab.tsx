// features/contrataciones/components/ContratacionTab.tsx
//
// Pestaña "Contratación" de la ficha del postulante: su(s) contratación(es) y el seguimiento post-ingreso.
// La contratación se registra desde "Dónde ha postulado" (botón Contratado).
"use client";

import { BadgeCheck } from "lucide-react";
import { Skeleton } from "@/components/shared/Skeleton";
import { ToastContainer, useToast } from "@/components/shared/Toast";
import { useReferenciasSeleccion } from "@/features/postulantes/hooks/useReferenciasSeleccion";
import { useCargaConCache } from "@/lib/cacheCliente";
import { usePermisos } from "@/lib/usePermisos";
import { claveContrataciones, fetchContrataciones } from "../services/contratacionesService";
import { Contratacion } from "../types/contratacion.types";
import { ContratacionDetalle } from "./ContratacionDetalle";

interface ContratacionTabProps {
  postulanteId: string;
  onCambio: () => void; // cambiar una contratación puede cambiar la etapa de la postulación: la ficha se refresca
}

export function ContratacionTab({ postulanteId, onCambio }: ContratacionTabProps) {
  const { datos, cargando, error, recargar } = useCargaConCache<Contratacion[]>(claveContrataciones({ postulanteId }), () =>
    fetchContrataciones({ postulanteId })
  );
  const { vacante } = useReferenciasSeleccion();
  const { toasts, mostrarToast } = useToast();
  // Admin, Supervisor y RRHH gestionan entrevistas y contrataciones (ver lib/permisos.ts).
  const puedeEditar = usePermisos().puedeGestionarSeleccion;

  const alCambiar = (mensaje: string, tipo: "success" | "error" = "success") => {
    mostrarToast(mensaje, tipo);
    if (tipo === "success") {
      void recargar();
      onCambio();
    }
  };

  if (cargando) {
    return (
      <div aria-hidden className="space-y-3 rounded-lg border border-gray-100 p-4">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-3.5 w-72" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }
  if (error) return <p className="py-6 text-center text-sm text-red-500">{error}</p>;

  const contrataciones = datos ?? [];
  if (contrataciones.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        <BadgeCheck className="mx-auto mb-2 text-gray-300" size={28} />
        Aún no hay contrataciones. Se registra desde la pestaña &quot;Dónde ha postulado&quot;, con el botón <strong>Contratado</strong>.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {contrataciones.map((c) => {
        const v = vacante(c.anuncioId);
        return (
          <div key={c.id} className="rounded-lg border border-gray-100 p-4">
            <ContratacionDetalle
              contratacion={c}
              etiquetaVacante={`${v.cargo}${v.empresa ? ` · ${v.empresa}` : ""}`}
              puedeEditar={puedeEditar}
              onCambio={alCambiar}
            />
          </div>
        );
      })}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
