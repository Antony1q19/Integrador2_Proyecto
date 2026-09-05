// features/postulantes/components/EvaluacionesTab.tsx
"use client";

import { useMemo, useState } from "react";
import { CompetenciasEvaluacion, EstadoCarneSanidad, Evaluacion } from "../types/postulante.types";
import { COMPETENCIAS, calcularPuntajeTotal, calcularResultado } from "../utils/evaluacion";

const ETIQUETAS_CARNE_SANIDAD: Record<EstadoCarneSanidad, string> = {
  NO_CUENTA: "No cuenta",
  TRAMITE: "En trámite",
  SI_CUENTA: "Sí cuenta",
};

const COMPETENCIAS_INICIALES: CompetenciasEvaluacion = {
  comunicacionEfectiva: 3,
  orientacionCliente: 3,
  responsabilidad: 3,
  adaptabilidadFlexibilidad: 3,
  toleranciaPresion: 3,
  dinamismoEnergia: 3,
};

interface EvaluacionesTabProps {
  evaluaciones: Evaluacion[];
  guardando: boolean;
  onRegistrar: (evaluacion: Omit<Evaluacion, "id">) => Promise<void>;
}

function ResultadoBadge({ resultado }: { resultado: Evaluacion["resultado"] }) {
  const esApto = resultado === "APTO";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        esApto ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {esApto ? "Apto" : "No apto"}
    </span>
  );
}

type EstadoRequisito = "ok" | "pendiente" | "no";

const ESTILOS_REQUISITO: Record<EstadoRequisito, string> = {
  ok: "bg-slate-50 text-slate-600",
  pendiente: "bg-amber-50 text-amber-700",
  no: "bg-red-50 text-red-600",
};

const ICONOS_REQUISITO: Record<EstadoRequisito, string> = {
  ok: "✓",
  pendiente: "…",
  no: "✕",
};

function RequisitoBadge({ estado, etiqueta }: { estado: EstadoRequisito; etiqueta: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${ESTILOS_REQUISITO[estado]}`}
    >
      {ICONOS_REQUISITO[estado]} {etiqueta}
    </span>
  );
}

export function EvaluacionesTab({ evaluaciones, guardando, onRegistrar }: EvaluacionesTabProps) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({
    evaluador: "",
    fecha: new Date().toISOString().slice(0, 10),
    competencias: COMPETENCIAS_INICIALES,
    carneSanidad: "NO_CUENTA" as EstadoCarneSanidad,
    antecedentesPenales: false,
    comentarios: "",
  });

  const puntajePreview = useMemo(() => calcularPuntajeTotal(form.competencias), [form.competencias]);
  const resultadoPreview = useMemo(
    () => calcularResultado(form.competencias, form.carneSanidad, form.antecedentesPenales),
    [form.competencias, form.carneSanidad, form.antecedentesPenales]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRegistrar({
      evaluador: form.evaluador,
      fecha: form.fecha,
      competencias: form.competencias,
      puntajeTotal: puntajePreview,
      resultado: resultadoPreview,
      carneSanidad: form.carneSanidad,
      antecedentesPenales: form.antecedentesPenales,
      comentarios: form.comentarios,
    });
    setForm({
      evaluador: "",
      fecha: new Date().toISOString().slice(0, 10),
      competencias: COMPETENCIAS_INICIALES,
      carneSanidad: "NO_CUENTA",
      antecedentesPenales: false,
      comentarios: "",
    });
    setMostrarForm(false);
  };

  const promedio =
    evaluaciones.length > 0
      ? Math.round(evaluaciones.reduce((acc, e) => acc + e.puntajeTotal, 0) / evaluaciones.length)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Puntaje promedio</p>
          <p className="text-2xl font-semibold text-gray-900">
            {promedio !== null ? `${promedio}/100` : "—"}
          </p>
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="rounded-md bg-[#1D2B53] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#16224A]"
        >
          {mostrarForm ? "Cancelar" : "+ Registrar evaluación"}
        </button>
      </div>

      {mostrarForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-gray-100 bg-slate-50/60 p-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Evaluador</label>
              <input
                required
                value={form.evaluador}
                onChange={(e) => setForm({ ...form, evaluador: e.target.value })}
                className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-[#1D2B53] focus:outline-none focus:ring-1 focus:ring-[#1D2B53]"
                placeholder="Nombre del evaluador"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Fecha</label>
              <input
                type="date"
                required
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-[#1D2B53] focus:outline-none focus:ring-1 focus:ring-[#1D2B53]"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-gray-500">Competencias evaluadas (1 a 5)</p>
            <div className="space-y-2">
              {COMPETENCIAS.map(({ clave, etiqueta }) => (
                <div key={clave} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-700">{etiqueta}</span>
                  <div className="flex shrink-0 gap-1">
                    {[1, 2, 3, 4, 5].map((valor) => (
                      <button
                        key={valor}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            competencias: { ...form.competencias, [clave]: valor },
                          })
                        }
                        className={`h-7 w-7 rounded-md text-xs font-semibold transition-colors ${
                          form.competencias[clave] === valor
                            ? "bg-[#1D2B53] text-white"
                            : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {valor}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Carné de sanidad</label>
              <select
                value={form.carneSanidad}
                onChange={(e) =>
                  setForm({ ...form, carneSanidad: e.target.value as EstadoCarneSanidad })
                }
                className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-[#1D2B53] focus:outline-none focus:ring-1 focus:ring-[#1D2B53]"
              >
                <option value="NO_CUENTA">{ETIQUETAS_CARNE_SANIDAD.NO_CUENTA}</option>
                <option value="TRAMITE">{ETIQUETAS_CARNE_SANIDAD.TRAMITE}</option>
                <option value="SI_CUENTA">{ETIQUETAS_CARNE_SANIDAD.SI_CUENTA}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Antecedentes penales</label>
              <select
                value={form.antecedentesPenales ? "si" : "no"}
                onChange={(e) => setForm({ ...form, antecedentesPenales: e.target.value === "si" })}
                className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-[#1D2B53] focus:outline-none focus:ring-1 focus:ring-[#1D2B53]"
              >
                <option value="no">No registra</option>
                <option value="si">Sí registra</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Comentarios</label>
            <textarea
              value={form.comentarios}
              onChange={(e) => setForm({ ...form, comentarios: e.target.value })}
              rows={2}
              className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-[#1D2B53] focus:outline-none focus:ring-1 focus:ring-[#1D2B53]"
              placeholder="Observaciones de la evaluación"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-100 bg-white px-3 py-2">
            <span className="text-xs text-gray-500">
              Resultado automático · Puntaje {puntajePreview}/100
            </span>
            <ResultadoBadge resultado={resultadoPreview} />
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="rounded-md bg-[#1D2B53] px-4 py-2 text-sm font-medium text-white hover:bg-[#16224A] disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Guardar evaluación"}
          </button>
        </form>
      )}

      {evaluaciones.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          Este postulante aún no tiene evaluaciones registradas.
        </p>
      ) : (
        <ul className="space-y-3">
          {[...evaluaciones].reverse().map((ev) => (
            <li key={ev.id} className="rounded-lg border border-gray-100 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-[11px] text-gray-400">
                    {ev.evaluador} · {new Date(ev.fecha).toLocaleDateString("es-PE")}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-gray-800">{ev.puntajeTotal}/100</p>
                </div>
                <ResultadoBadge resultado={ev.resultado} />
              </div>

              <div className="mt-3 space-y-1.5">
                {COMPETENCIAS.map(({ clave, etiqueta }) => (
                  <div key={clave} className="flex items-center gap-2">
                    <span className="w-44 shrink-0 text-xs text-gray-500">{etiqueta}</span>
                    <div className="h-1.5 w-full rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full bg-[#1D2B53]"
                        style={{ width: `${(ev.competencias[clave] / 5) * 100}%` }}
                      />
                    </div>
                    <span className="w-4 shrink-0 text-right text-xs text-gray-400">
                      {ev.competencias[clave]}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <RequisitoBadge
                  estado={
                    ev.carneSanidad === "SI_CUENTA"
                      ? "ok"
                      : ev.carneSanidad === "TRAMITE"
                      ? "pendiente"
                      : "no"
                  }
                  etiqueta={`Carné de sanidad: ${ETIQUETAS_CARNE_SANIDAD[ev.carneSanidad]}`}
                />
                <RequisitoBadge
                  estado={ev.antecedentesPenales ? "no" : "ok"}
                  etiqueta="Sin antecedentes penales"
                />
              </div>

              {ev.comentarios && (
                <p className="mt-3 text-sm text-gray-600">{ev.comentarios}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
