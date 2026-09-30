// features/entrevistas/components/EntrevistaBadges.tsx
import { EstadoEntrevista, ResultadoEntrevista } from "../types/entrevista.types";

const ESTILOS_ESTADO: Record<EstadoEntrevista, string> = {
  Programada: "bg-blue-50 text-blue-700",
  Realizada: "bg-emerald-50 text-emerald-700",
  Cancelada: "bg-slate-100 text-slate-500",
  "No asistió": "bg-rose-50 text-rose-700",
};

const ESTILOS_RESULTADO: Record<ResultadoEntrevista, string> = {
  Aprobada: "bg-emerald-50 text-emerald-700",
  "No aprobada": "bg-rose-50 text-rose-700",
  "Pendiente de decisión": "bg-amber-50 text-amber-700",
};

export function EstadoEntrevistaBadge({ estado }: { estado: EstadoEntrevista }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${ESTILOS_ESTADO[estado]}`}>{estado}</span>;
}

export function ResultadoEntrevistaBadge({ resultado }: { resultado: ResultadoEntrevista }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${ESTILOS_RESULTADO[resultado]}`}>{resultado}</span>;
}
