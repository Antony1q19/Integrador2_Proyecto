// features/contrataciones/components/ContratacionBadges.tsx
import { EstadoContratacion, Seguimiento, ValoracionSeguimiento } from "../types/contratacion.types";

const ESTILOS_CONTRATACION: Record<EstadoContratacion, string> = {
  "Por ingresar": "bg-sky-50 text-sky-700",
  Activo: "bg-emerald-50 text-emerald-700",
  Finalizado: "bg-slate-100 text-slate-600",
  Cancelado: "bg-rose-50 text-rose-700",
};

const ESTILOS_VALORACION: Record<ValoracionSeguimiento, string> = {
  Satisfactorio: "bg-emerald-50 text-emerald-700",
  "Con observaciones": "bg-amber-50 text-amber-700",
  Insatisfactorio: "bg-rose-50 text-rose-700",
};

export function EstadoContratacionBadge({ estado }: { estado: EstadoContratacion }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${ESTILOS_CONTRATACION[estado]}`}>{estado}</span>;
}

export function ValoracionBadge({ valoracion }: { valoracion: ValoracionSeguimiento }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${ESTILOS_VALORACION[valoracion]}`}>{valoracion}</span>;
}

// Un puntito por cada control (30, 60, 90...) para ver de un vistazo cómo va: hecho, pendiente, vencido u omitido.
export function PuntosDeSeguimiento({ seguimientos }: { seguimientos: Seguimiento[] }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {seguimientos.map((s) => {
        const color =
          s.estado === "Realizado" ? "bg-emerald-500" : s.estado === "Omitido" ? "bg-slate-300" : s.vencido ? "bg-rose-500" : "bg-amber-400";
        const texto = `${s.hitoDias} días: ${s.estado === "Pendiente" && s.vencido ? "Vencido" : s.estado}`;
        return <span key={s.id} title={texto} aria-label={texto} className={`h-2.5 w-2.5 rounded-full ${color}`} />;
      })}
    </span>
  );
}
