// features/dashboard/components/EmbudoSeleccion.tsx
//
// Embudo del proceso de selección: cuántas postulaciones del periodo están HOY en cada etapa.
import { EstadoProceso } from "@/features/postulantes/types/postulante.types";
import { ESTILOS_ESTADO } from "@/features/postulantes/components/EstadoBadge";

const COLOR_BARRA: Record<EstadoProceso, string> = {
  POSTULADO: "bg-slate-400",
  EN_EVALUACION: "bg-amber-400",
  ENTREVISTA: "bg-blue-500",
  PRESELECCIONADO: "bg-violet-500",
  CONTRATADO: "bg-emerald-500",
  DESCARTADO: "bg-rose-400",
};

interface EmbudoSeleccionProps {
  embudo: { estado: EstadoProceso; cantidad: number }[];
}

export function EmbudoSeleccion({ embudo }: EmbudoSeleccionProps) {
  const total = embudo.reduce((suma, etapa) => suma + etapa.cantidad, 0);

  if (total === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">No hay postulaciones en este periodo.</p>;
  }

  return (
    <ul className="space-y-3">
      {embudo.map(({ estado, cantidad }) => {
        const porcentaje = Math.round((cantidad * 100) / total);
        return (
          <li key={estado}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-medium text-slate-700">{ESTILOS_ESTADO[estado].label}</span>
              <span className="text-slate-500">
                <strong className="text-slate-800">{cantidad}</strong> · {porcentaje}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-2.5 rounded-full ${COLOR_BARRA[estado]}`} style={{ width: `${porcentaje}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
