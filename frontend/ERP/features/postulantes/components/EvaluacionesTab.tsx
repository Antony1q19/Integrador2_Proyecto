// features/postulantes/components/EvaluacionesTab.tsx
"use client";

import { useMemo, useState } from "react";
import { CompetenciasEvaluacion, Evaluacion, NuevaEvaluacion } from "../types/postulante.types";
import { COMPETENCIAS, calcularPuntajeTotal, calcularResultado } from "../utils/evaluacion";

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
  onRegistrar: (evaluacion: NuevaEvaluacion) => Promise<void>;
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

export function EvaluacionesTab({ evaluaciones, guardando, onRegistrar }: EvaluacionesTabProps) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // El evaluador (la cuenta con sesión iniciada) y la fecha los pone el sistema al guardar.
  const [form, setForm] = useState<NuevaEvaluacion>({
    competencias: COMPETENCIAS_INICIALES,
    comentarios: "",
  });

  const puntajePreview = useMemo(() => calcularPuntajeTotal(form.competencias), [form.competencias]);
  const resultadoPreview = useMemo(() => calcularResultado(form.competencias), [form.competencias]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onRegistrar(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la evaluación.");
      return; // se conserva lo escrito para poder reintentar
    }
    setForm({ competencias: COMPETENCIAS_INICIALES, comentarios: "" });
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
          className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          {mostrarForm ? "Cancelar" : "+ Registrar evaluación"}
        </button>
      </div>

      {mostrarForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-gray-100 bg-slate-50/60 p-4"
        >
          <p className="text-xs text-gray-400">
            El evaluador es tu cuenta y la fecha es la de hoy: se registran automáticamente al guardar.
          </p>

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
                        className={`h-7 w-7 rounded-lg text-xs font-semibold transition-colors ${
                          form.competencias[clave] === valor
                            ? "bg-primary-600 text-white"
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

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Comentarios</label>
            <textarea
              value={form.comentarios}
              onChange={(e) => setForm({ ...form, comentarios: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
              placeholder="Observaciones de la evaluación"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2">
            <span className="text-xs text-gray-500">
              Resultado automático · Puntaje {puntajePreview}/100
            </span>
            <ResultadoBadge resultado={resultadoPreview} />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
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
                    {ev.evaluador} · {new Date(`${ev.fecha}T00:00:00`).toLocaleDateString("es-PE")}
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
                        className="h-1.5 rounded-full bg-primary-600"
                        style={{ width: `${(ev.competencias[clave] / 5) * 100}%` }}
                      />
                    </div>
                    <span className="w-4 shrink-0 text-right text-xs text-gray-400">
                      {ev.competencias[clave]}
                    </span>
                  </div>
                ))}
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
