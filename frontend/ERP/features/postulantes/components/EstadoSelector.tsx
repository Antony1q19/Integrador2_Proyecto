// features/postulantes/components/EstadoSelector.tsx
//
// Selector visual de estado (HU-09): un badge que al hacer clic despliega un
// dropdown con los estados del pipeline. Se usa tanto en la ficha del
// postulante como en la vista Kanban.
//
// Solo incluye los estados "activos" del proceso: Contratado y Descartado
// son decisiones finales y se registran con los botones dedicados en la
// ficha del postulante (ver PostulanteFicha.tsx), no desde este dropdown
// ni desde el tablero Kanban.
"use client";

import { useEffect, useRef, useState } from "react";
import { EstadoProceso } from "../types/postulante.types";
import { EstadoBadge, ESTILOS_ESTADO } from "./EstadoBadge";

const ESTADOS_FINALES: EstadoProceso[] = ["CONTRATADO", "DESCARTADO"];

export const OPCIONES_ESTADO: { value: EstadoProceso; label: string }[] = (
  Object.keys(ESTILOS_ESTADO) as EstadoProceso[]
)
  .filter((value) => !ESTADOS_FINALES.includes(value))
  .map((value) => ({ value, label: ESTILOS_ESTADO[value].label }));

interface EstadoSelectorProps {
  estadoActual: EstadoProceso;
  disabled?: boolean;
  onSeleccionar: (estado: EstadoProceso) => void;
}

export function EstadoSelector({ estadoActual, disabled, onSeleccionar }: EstadoSelectorProps) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  return (
    <div ref={contenedorRef} className="relative inline-block text-left">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-1.5 rounded-full transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        <EstadoBadge estado={estadoActual} />
        <span className="text-xs text-gray-400">▾</span>
      </button>

      {abierto && (
        <div className="absolute left-0 z-10 mt-1.5 w-56 overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
          {OPCIONES_ESTADO.map((op) => (
            <button
              key={op.value}
              type="button"
              onClick={() => {
                setAbierto(false);
                if (op.value !== estadoActual) onSeleccionar(op.value);
              }}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                op.value === estadoActual ? "font-medium text-gray-900" : "text-gray-600"
              }`}
            >
              {op.label}
              {op.value === estadoActual && <span className="text-[#1D2B53]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
