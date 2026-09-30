// features/entrevistas/components/CerrarEntrevistaModal.tsx
//
// Ventana para REGISTRAR CÓMO SALIÓ una entrevista: si se realizó (con su resultado y notas) o si el postulante no asistió.
"use client";

import { useState } from "react";
import { BotonesModal, Campo, ESTILO_CAMPO, Modal } from "@/components/shared/Modal";
import { formatoFechaHora } from "@/lib/fechasLima";
import { actualizarEntrevista } from "../services/entrevistasService";
import { Entrevista, RESULTADOS_ENTREVISTA, ResultadoEntrevista } from "../types/entrevista.types";

interface CerrarEntrevistaModalProps {
  entrevista: Entrevista;
  onCerrar: () => void;
  onGuardada: (entrevista: Entrevista) => void;
}

export function CerrarEntrevistaModal({ entrevista, onCerrar, onGuardada }: CerrarEntrevistaModalProps) {
  const [seRealizo, setSeRealizo] = useState(true);
  const [resultado, setResultado] = useState<ResultadoEntrevista>("Pendiente de decisión");
  const [notas, setNotas] = useState(entrevista.notas ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      const guardada = await actualizarEntrevista(
        entrevista,
        seRealizo ? { estado: "Realizada", resultado, notas: notas.trim() } : { estado: "No asistió", notas: notas.trim() }
      );
      onGuardada(guardada);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="Registrar resultado de la entrevista" subtitulo={formatoFechaHora(entrevista.fechaHora)} onCerrar={onCerrar} bloqueado={guardando} ancho="sm">
      <form onSubmit={enviar} className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          {[
            { valor: true, texto: "Se realizó" },
            { valor: false, texto: "No asistió" },
          ].map((op) => (
            <button
              key={op.texto}
              type="button"
              onClick={() => setSeRealizo(op.valor)}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors ${seRealizo === op.valor ? "bg-white text-[#1D2B53] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {op.texto}
            </button>
          ))}
        </div>

        {seRealizo && (
          <Campo etiqueta="Resultado">
            <select value={resultado} onChange={(e) => setResultado(e.target.value as ResultadoEntrevista)} className={ESTILO_CAMPO}>
              {RESULTADOS_ENTREVISTA.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Campo>
        )}

        <Campo etiqueta="Notas">
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} placeholder="Impresiones, puntos a favor o en contra…" className={ESTILO_CAMPO} />
        </Campo>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        <BotonesModal guardando={guardando} textoGuardar="Guardar" onCancelar={onCerrar} />
      </form>
    </Modal>
  );
}
