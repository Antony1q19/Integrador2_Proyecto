// features/postulantes/components/Timeline.tsx
import { EstadoProceso, ORDEN_PIPELINE } from "../types/postulante.types";

const ETIQUETAS: Record<EstadoProceso, string> = {
  POSTULADO: "Postulado",
  EN_EVALUACION: "Evaluación",
  ENTREVISTA: "Entrevista",
  PRESELECCIONADO: "Preseleccionado",
  CONTRATADO: "Contratado",
  DESCARTADO: "Descartado",
};

export function Timeline({ estadoActual }: { estadoActual: EstadoProceso }) {
  if (estadoActual === "DESCARTADO") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Proceso descartado — el candidato no continúa en este pipeline.
      </div>
    );
  }

  const indiceActual = ORDEN_PIPELINE.indexOf(estadoActual);

  return (
    <div className="flex items-center">
      {ORDEN_PIPELINE.map((estado, i) => {
        const completado = i < indiceActual;
        const activo = i === indiceActual;
        const esUltimo = i === ORDEN_PIPELINE.length - 1;

        return (
          <div key={estado} className={`flex items-center ${esUltimo ? "" : "flex-1"}`}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                  completado
                    ? "bg-[#1D2B53] text-white"
                    : activo
                    ? "border-2 border-[#1D2B53] bg-white text-[#1D2B53]"
                    : "border border-gray-200 bg-white text-gray-300",
                ].join(" ")}
              >
                {completado ? "✓" : i + 1}
              </div>
              <span
                className={`whitespace-nowrap text-[11px] font-medium ${
                  activo ? "text-gray-900" : completado ? "text-gray-500" : "text-gray-300"
                }`}
              >
                {ETIQUETAS[estado]}
              </span>
            </div>
            {!esUltimo && (
              <div
                className={`mx-2 mb-4 h-px flex-1 ${completado ? "bg-[#1D2B53]" : "bg-gray-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
