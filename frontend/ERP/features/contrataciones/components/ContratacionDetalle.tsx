// features/contrataciones/components/ContratacionDetalle.tsx
//
// El detalle de UNA contratación: sus datos (cargo, ingreso, tipo, salario), la línea de tiempo de los controles
// post-ingreso (30, 60, 90 días...) y las acciones. Se usa en la ficha del postulante y en la página Contrataciones.
"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Clock, MinusCircle, AlertCircle, Plus } from "lucide-react";
import { formatoFecha } from "@/lib/fechasLima";
import { actualizarContratacion, actualizarSeguimiento, agregarSeguimiento } from "../services/contratacionesService";
import { Contratacion, Seguimiento } from "../types/contratacion.types";
import { EstadoContratacionBadge, ValoracionBadge } from "./ContratacionBadges";
import { ContratacionModal } from "./ContratacionModal";
import { SeguimientoModal } from "./SeguimientoModal";
import ConfirmacionModal from "@/components/shared/ConfirmacionModal";

type EstadoFinal = "Finalizado" | "Cancelado";

interface ContratacionDetalleProps {
  contratacion: Contratacion;
  etiquetaVacante: string; // ej. "Analista · Consultora Andina"
  puedeEditar: boolean;
  onCambio: (mensaje: string, tipo?: "success" | "error") => void;
}

function IconoSeguimiento({ s }: { s: Seguimiento }) {
  if (s.estado === "Realizado") return <CheckCircle2 size={20} className="text-emerald-500" />;
  if (s.estado === "Omitido") return <MinusCircle size={20} className="text-slate-300" />;
  if (s.vencido) return <AlertCircle size={20} className="text-rose-500" />;
  return <Clock size={20} className="text-amber-400" />;
}

export function ContratacionDetalle({ contratacion: c, etiquetaVacante, puedeEditar, onCambio }: ContratacionDetalleProps) {
  const [editando, setEditando] = useState(false);
  const [registrando, setRegistrando] = useState<Seguimiento | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [dias, setDias] = useState("15");
  const [ocupado, setOcupado] = useState(false);
  // Finalizar/cancelar piden confirmación antes (ver ConfirmacionModal al final).
  const [confirmandoEstado, setConfirmandoEstado] = useState<EstadoFinal | null>(null);

  const viva = c.estado === "Por ingresar" || c.estado === "Activo";

  // Ejecuta una acción, avisa el resultado y deja de estar "ocupado".
  const ejecutar = async (accion: () => Promise<unknown>, mensaje: string) => {
    setOcupado(true);
    try {
      await accion();
      onCambio(mensaje);
    } catch (e) {
      onCambio(e instanceof Error ? e.message : "No se pudo completar la acción", "error");
    } finally {
      setOcupado(false);
    }
  };

  const cambiarEstado = (estado: "Activo" | EstadoFinal) =>
    ejecutar(() => actualizarContratacion(c, { estado }), `Contratación ${estado === "Activo" ? "marcada como activa" : estado.toLowerCase()}`);

  const estiloBoton = "rounded-lg px-2.5 py-1 text-xs font-medium disabled:opacity-40";
  return (
    <div className="space-y-5">
      {/* Datos */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{c.cargo}</p>
          <p className="text-xs text-slate-500">{etiquetaVacante}</p>
        </div>
        <EstadoContratacionBadge estado={c.estado} />
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-400">Ingreso</dt>
          <dd className="font-medium text-slate-700">{formatoFecha(c.fechaIngreso)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-400">Contrato</dt>
          <dd className="font-medium text-slate-700">{c.tipoContrato}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-400">Salario</dt>
          <dd className="font-medium text-slate-700">
            {c.salario != null ? `${c.moneda === "USD" ? "US$" : "S/"} ${c.salario.toLocaleString("es-PE", { minimumFractionDigits: 2 })}` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-400">Registrado por</dt>
          <dd className="font-medium text-slate-700">{c.creadoPor}</dd>
        </div>
      </dl>
      {c.observaciones && <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{c.observaciones}</p>}

      {/* Línea de tiempo de controles */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Seguimiento post-ingreso</h4>
          {puedeEditar && viva && !agregando && (
            <button onClick={() => setAgregando(true)} className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline">
              <Plus size={13} /> Agregar control
            </button>
          )}
        </div>

        {agregando && (
          <form
            className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(dias);
              if (!Number.isInteger(n) || n < 1) return;
              void ejecutar(() => agregarSeguimiento(c, n), "Control agregado").then(() => setAgregando(false));
            }}
          >
            <span className="text-xs text-slate-600">Control a los</span>
            <input type="number" min={1} max={730} value={dias} onChange={(e) => setDias(e.target.value)} className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm" />
            <span className="text-xs text-slate-600">días del ingreso</span>
            <button type="submit" disabled={ocupado} className={`${estiloBoton} bg-primary-600 text-white`}>
              Agregar
            </button>
            <button type="button" onClick={() => setAgregando(false)} className={`${estiloBoton} text-slate-500`}>
              Cancelar
            </button>
          </form>
        )}

        <ol className="space-y-1">
          {c.seguimientos.map((s, i) => (
            <li key={s.id} className="relative flex gap-3 pb-3">
              {i < c.seguimientos.length - 1 && <span className="absolute left-[9px] top-6 h-full w-px bg-slate-200" aria-hidden />}
              <span className="relative z-10 mt-0.5 bg-white">
                <IconoSeguimiento s={s} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-sm font-medium text-slate-700">Control a los {s.hitoDias} días</p>
                  {s.estado === "Realizado" && s.valoracion && <ValoracionBadge valoracion={s.valoracion} />}
                  {s.estado === "Omitido" && <span className="text-[11px] text-slate-400">Omitido</span>}
                  {s.vencido && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-600">Vencido</span>}
                </div>
                <p className="text-xs text-slate-400">
                  {s.estado === "Realizado" && s.fechaRealizada
                    ? `Realizado el ${formatoFecha(s.fechaRealizada)}${s.realizadoPor ? ` por ${s.realizadoPor}` : ""}`
                    : `Programado para el ${formatoFecha(s.fechaProgramada)}`}
                </p>
                {s.observaciones && <p className="mt-1 text-xs text-slate-500">{s.observaciones}</p>}
                {puedeEditar && (
                  <div className="mt-1 flex gap-1">
                    {s.estado === "Pendiente" && (
                      <>
                        <button onClick={() => setRegistrando(s)} className={`${estiloBoton} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}>
                          Registrar control
                        </button>
                        <button
                          onClick={() => void ejecutar(() => actualizarSeguimiento(s, { estado: "Omitido" }), "Control omitido")}
                          disabled={ocupado}
                          className={`${estiloBoton} text-slate-400 hover:bg-slate-100`}
                        >
                          Omitir
                        </button>
                      </>
                    )}
                    {s.estado !== "Pendiente" && viva && (
                      <button
                        onClick={() => void ejecutar(() => actualizarSeguimiento(s, { estado: "Pendiente" }), "Control reabierto")}
                        disabled={ocupado}
                        className={`${estiloBoton} text-slate-400 hover:bg-slate-100`}
                      >
                        Reabrir
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
          {c.seguimientos.length === 0 && (
            <li className="flex items-center gap-2 text-xs text-slate-400">
              <Circle size={14} /> Sin controles programados.
            </li>
          )}
        </ol>
      </div>

      {/* Acciones de la contratación */}
      {puedeEditar && (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button onClick={() => setEditando(true)} className={`${estiloBoton} border border-slate-200 text-slate-600 hover:bg-slate-50`}>
            Editar datos
          </button>
          {c.estado === "Por ingresar" && (
            <button onClick={() => void cambiarEstado("Activo")} disabled={ocupado} className={`${estiloBoton} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}>
              Marcar ingreso
            </button>
          )}
          {viva && (
            <>
              <button
                onClick={() => setConfirmandoEstado("Finalizado")}
                disabled={ocupado}
                className={`${estiloBoton} border border-slate-200 text-slate-600 hover:bg-slate-50`}
              >
                Finalizar
              </button>
              <button
                onClick={() => setConfirmandoEstado("Cancelado")}
                disabled={ocupado}
                className={`${estiloBoton} text-slate-400 hover:bg-red-50 hover:text-red-600`}
              >
                Cancelar contratación
              </button>
            </>
          )}
        </div>
      )}

      {editando && (
        <ContratacionModal
          contratacion={c}
          onCerrar={() => setEditando(false)}
          onGuardada={() => {
            setEditando(false);
            onCambio("Contratación actualizada");
          }}
        />
      )}
      {confirmandoEstado && (
        <ConfirmacionModal
          titulo={confirmandoEstado === "Finalizado" ? "¿Finalizar esta contratación?" : "¿Cancelar esta contratación?"}
          mensaje="Los controles de seguimiento que estén pendientes se omitirán."
          labelConfirmar={confirmandoEstado === "Finalizado" ? "Finalizar" : "Cancelar contratación"}
          labelCancelar="Volver"
          labelConfirmando="Guardando…"
          variante={confirmandoEstado === "Cancelado" ? "peligro" : "primario"}
          confirmando={ocupado}
          onConfirmar={() => void cambiarEstado(confirmandoEstado).then(() => setConfirmandoEstado(null))}
          onCancelar={() => setConfirmandoEstado(null)}
        />
      )}
      {registrando && (
        <SeguimientoModal
          seguimiento={registrando}
          onCerrar={() => setRegistrando(null)}
          onGuardado={() => {
            setRegistrando(null);
            onCambio("Seguimiento registrado");
          }}
        />
      )}
    </div>
  );
}
