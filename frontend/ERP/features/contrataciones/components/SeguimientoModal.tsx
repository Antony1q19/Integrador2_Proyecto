// features/contrataciones/components/SeguimientoModal.tsx
//
// Ventana para REGISTRAR un control post-ingreso: cómo va la persona (valoración), qué se observó y cuándo se hizo.
"use client";

import { useState } from "react";
import { BotonesModal, Campo, ESTILO_CAMPO, Modal } from "@/components/shared/Modal";
import { hoyEnLima } from "@/lib/fechasLima";
import { actualizarSeguimiento } from "../services/contratacionesService";
import { Seguimiento, VALORACIONES_SEGUIMIENTO, ValoracionSeguimiento } from "../types/contratacion.types";

interface SeguimientoModalProps {
  seguimiento: Seguimiento;
  onCerrar: () => void;
  onGuardado: (seguimiento: Seguimiento) => void;
}

export function SeguimientoModal({ seguimiento, onCerrar, onGuardado }: SeguimientoModalProps) {
  const [valoracion, setValoracion] = useState<ValoracionSeguimiento>("Satisfactorio");
  const [fechaRealizada, setFechaRealizada] = useState(hoyEnLima());
  const [observaciones, setObservaciones] = useState(seguimiento.observaciones ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      onGuardado(
        await actualizarSeguimiento(seguimiento, {
          estado: "Realizado",
          valoracion,
          fechaRealizada,
          observaciones: observaciones.trim(),
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el seguimiento");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={`Seguimiento a los ${seguimiento.hitoDias} días`} onCerrar={onCerrar} bloqueado={guardando} ancho="sm">
      <form onSubmit={enviar} className="space-y-4">
        <Campo etiqueta="¿Cómo va la persona?" obligatorio>
          <div className="grid grid-cols-3 gap-2">
            {VALORACIONES_SEGUIMIENTO.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setValoracion(v)}
                className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                  valoracion === v ? "border-[#1D2B53] bg-[#1D2B53] text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </Campo>

        <Campo etiqueta="Fecha en que se hizo">
          <input type="date" value={fechaRealizada} max={hoyEnLima()} onChange={(e) => setFechaRealizada(e.target.value)} className={ESTILO_CAMPO} />
        </Campo>

        <Campo etiqueta="Observaciones">
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} className={ESTILO_CAMPO} placeholder="Adaptación al equipo, desempeño, comentarios del cliente…" />
        </Campo>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        <BotonesModal guardando={guardando} textoGuardar="Guardar seguimiento" onCancelar={onCerrar} />
      </form>
    </Modal>
  );
}
