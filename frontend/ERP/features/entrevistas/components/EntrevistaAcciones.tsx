// features/entrevistas/components/EntrevistaAcciones.tsx
//
// Los botones de una entrevista PROGRAMADA (registrar resultado, reprogramar, cancelar) con sus ventanas.
// Se usa en la ficha del postulante y en la Agenda. Quien lo usa recibe un aviso (`onCambio`) al guardar.
"use client";

import { useState } from "react";
import { actualizarEntrevista } from "../services/entrevistasService";
import { Entrevista } from "../types/entrevista.types";
import { CerrarEntrevistaModal } from "./CerrarEntrevistaModal";
import { EntrevistaModal } from "./EntrevistaModal";

interface EntrevistaAccionesProps {
  entrevista: Entrevista;
  onCambio: (mensaje: string, tipo?: "success" | "error") => void;
}

export function EntrevistaAcciones({ entrevista, onCambio }: EntrevistaAccionesProps) {
  const [ventana, setVentana] = useState<"resultado" | "reprogramar" | null>(null);
  const [cancelando, setCancelando] = useState(false);

  if (entrevista.estado !== "Programada") return null;

  const cancelar = async () => {
    if (!window.confirm("¿Cancelar esta entrevista?")) return;
    setCancelando(true);
    try {
      await actualizarEntrevista(entrevista, { estado: "Cancelada" });
      onCambio("Entrevista cancelada");
    } catch (e) {
      onCambio(e instanceof Error ? e.message : "No se pudo cancelar", "error");
    } finally {
      setCancelando(false);
    }
  };

  const estiloBoton = "rounded-md px-2 py-1 text-xs font-medium disabled:opacity-40";
  return (
    <>
      <div className="flex flex-wrap items-center gap-1">
        <button onClick={() => setVentana("resultado")} className={`${estiloBoton} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}>
          Registrar resultado
        </button>
        <button onClick={() => setVentana("reprogramar")} className={`${estiloBoton} text-slate-500 hover:bg-slate-100`}>
          Reprogramar
        </button>
        <button onClick={cancelar} disabled={cancelando} className={`${estiloBoton} text-slate-400 hover:bg-red-50 hover:text-red-600`}>
          {cancelando ? "Cancelando…" : "Cancelar"}
        </button>
      </div>

      {ventana === "resultado" && (
        <CerrarEntrevistaModal
          entrevista={entrevista}
          onCerrar={() => setVentana(null)}
          onGuardada={() => {
            setVentana(null);
            onCambio("Resultado de la entrevista guardado");
          }}
        />
      )}
      {ventana === "reprogramar" && (
        <EntrevistaModal
          entrevista={entrevista}
          onCerrar={() => setVentana(null)}
          onGuardada={() => {
            setVentana(null);
            onCambio("Entrevista reprogramada");
          }}
        />
      )}
    </>
  );
}
