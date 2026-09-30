// features/contrataciones/components/ContratacionModal.tsx
//
// Ventana para REGISTRAR la contratación de una postulación (o corregir una ya registrada). Registrarla marca la
// postulación como "Contratado" y programa los controles de 30, 60 y 90 días.
"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { BotonesModal, Campo, ESTILO_CAMPO, Modal } from "@/components/shared/Modal";
import { hoyEnLima } from "@/lib/fechasLima";
import { actualizarContratacion, registrarContratacion } from "../services/contratacionesService";
import { Contratacion, TIPOS_CONTRATO, TipoContrato } from "../types/contratacion.types";

interface ContratacionModalProps {
  // Para REGISTRAR:
  postulanteId?: string;
  anuncioId?: number;
  cargoSugerido?: string;
  nombrePostulante?: string;
  // Para CORREGIR una existente:
  contratacion?: Contratacion;
  onCerrar: () => void;
  onGuardada: (contratacion: Contratacion) => void;
}

export function ContratacionModal({ postulanteId, anuncioId, cargoSugerido, nombrePostulante, contratacion, onCerrar, onGuardada }: ContratacionModalProps) {
  const esEdicion = contratacion !== undefined;
  const [cargo, setCargo] = useState(contratacion?.cargo ?? cargoSugerido ?? "");
  const [fechaIngreso, setFechaIngreso] = useState(contratacion?.fechaIngreso ?? hoyEnLima());
  const [tipoContrato, setTipoContrato] = useState<TipoContrato>(contratacion?.tipoContrato ?? "Plazo fijo");
  const [salario, setSalario] = useState(contratacion?.salario != null ? String(contratacion.salario) : "");
  const [moneda, setMoneda] = useState(contratacion?.moneda ?? "PEN");
  const [observaciones, setObservaciones] = useState(contratacion?.observaciones ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (cargo.trim().length < 2 || !fechaIngreso) {
      setError("Indica el cargo y la fecha de ingreso.");
      return;
    }
    const sueldo = salario.trim() === "" ? null : Number(salario);
    if (sueldo !== null && (Number.isNaN(sueldo) || sueldo < 0)) {
      setError("El salario debe ser un número mayor o igual a 0.");
      return;
    }

    setGuardando(true);
    try {
      const guardada = esEdicion
        ? await actualizarContratacion(contratacion, {
            cargo: cargo.trim(),
            fechaIngreso,
            tipoContrato,
            salario: sueldo,
            moneda,
            observaciones: observaciones.trim(),
          })
        : await registrarContratacion({
            postulanteId: postulanteId ?? "",
            anuncioId: anuncioId ?? 0,
            cargo: cargo.trim(),
            fechaIngreso,
            tipoContrato,
            salario: sueldo,
            moneda,
            observaciones: observaciones.trim() || undefined,
          });
      onGuardada(guardada);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la contratación");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      titulo={esEdicion ? "Editar contratación" : "Registrar contratación"}
      subtitulo={nombrePostulante}
      onCerrar={onCerrar}
      bloqueado={guardando}
    >
      <form onSubmit={enviar} className="space-y-4">
        {!esEdicion && (
          <p className="flex gap-2 rounded-lg bg-sky-50 px-3 py-2.5 text-xs text-sky-800">
            <Info size={15} className="mt-0.5 shrink-0" />
            Al guardar, la postulación pasa a <strong className="mx-1">Contratado</strong> y se programan los controles de seguimiento a los 30, 60 y 90 días del ingreso.
          </p>
        )}

        <Campo etiqueta="Cargo contratado" obligatorio>
          <input value={cargo} onChange={(e) => setCargo(e.target.value)} className={ESTILO_CAMPO} />
        </Campo>

        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Fecha de ingreso" obligatorio>
            <input type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} className={ESTILO_CAMPO} />
          </Campo>
          <Campo etiqueta="Tipo de contrato" obligatorio>
            <select value={tipoContrato} onChange={(e) => setTipoContrato(e.target.value as TipoContrato)} className={ESTILO_CAMPO}>
              {TIPOS_CONTRATO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Campo etiqueta="Salario mensual">
              <input type="number" min="0" step="0.01" value={salario} onChange={(e) => setSalario(e.target.value)} placeholder="Opcional" className={ESTILO_CAMPO} />
            </Campo>
          </div>
          <Campo etiqueta="Moneda">
            <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className={ESTILO_CAMPO}>
              <option value="PEN">S/ (PEN)</option>
              <option value="USD">US$ (USD)</option>
            </select>
          </Campo>
        </div>

        <Campo etiqueta="Observaciones">
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className={ESTILO_CAMPO} placeholder="Condiciones acordadas, horario, período de prueba…" />
        </Campo>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        <BotonesModal guardando={guardando} textoGuardar={esEdicion ? "Guardar cambios" : "Registrar contratación"} onCancelar={onCerrar} />
      </form>
    </Modal>
  );
}
