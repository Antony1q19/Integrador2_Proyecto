// features/postulantes/components/EstadoBadge.tsx
import { EstadoProceso } from "../types/postulante.types";

const ESTILOS_ESTADO: Record<EstadoProceso, { bg: string; text: string; label: string }> = {
  POSTULADO: { bg: "bg-slate-100", text: "text-slate-600", label: "Postulado" },
  EN_EVALUACION: { bg: "bg-amber-50", text: "text-amber-700", label: "En evaluación" },
  ENTREVISTA: { bg: "bg-blue-50", text: "text-blue-700", label: "Entrevista" },
  PRESELECCIONADO: { bg: "bg-violet-50", text: "text-violet-700", label: "Preseleccionado" },
  CONTRATADO: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Contratado" },
  DESCARTADO: { bg: "bg-red-50", text: "text-red-700", label: "Descartado" },
};

export function EstadoBadge({ estado }: { estado: EstadoProceso }) {
  const estilo = ESTILOS_ESTADO[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${estilo.bg} ${estilo.text}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {estilo.label}
    </span>
  );
}

export { ESTILOS_ESTADO };
