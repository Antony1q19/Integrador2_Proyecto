// features/postulantes/components/EvaluacionesTab.tsx
"use client";

import { useState } from "react";
import { Evaluacion } from "../types/postulante.types";

const ETIQUETAS_TIPO: Record<Evaluacion["tipo"], string> = {
  ENTREVISTA_RRHH: "Entrevista RRHH",
  PRUEBA_TECNICA: "Prueba técnica",
  ENTREVISTA_SUPERVISOR: "Entrevista con supervisor",
  PSICOLOGICA: "Evaluación psicológica",
};

interface EvaluacionesTabProps {
  evaluaciones: Evaluacion[];
  guardando: boolean;
  onRegistrar: (evaluacion: Omit<Evaluacion, "id">) => Promise<void>;
}

export function EvaluacionesTab({ evaluaciones, guardando, onRegistrar }: EvaluacionesTabProps) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({
    tipo: "ENTREVISTA_RRHH" as Evaluacion["tipo"],
    evaluador: "",
    fecha: new Date().toISOString().slice(0, 10),
    puntaje: 70,
    comentarios: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRegistrar(form);
    setForm({ ...form, evaluador: "", comentarios: "" });
    setMostrarForm(false);
  };

  const promedio =
    evaluaciones.length > 0
      ? Math.round(evaluaciones.reduce((acc, e) => acc + e.puntaje, 0) / evaluaciones.length)
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
          className="grid grid-cols-1 gap-4 rounded-lg border border-gray-100 bg-slate-50/60 p-4 sm:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Tipo</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as Evaluacion["tipo"] })}
              className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-[#1D2B53] focus:outline-none focus:ring-1 focus:ring-[#1D2B53]"
            >
              {Object.entries(ETIQUETAS_TIPO).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>{etiqueta}</option>
              ))}
            </select>
          </div>
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
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Puntaje ({form.puntaje}/100)
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={form.puntaje}
              onChange={(e) => setForm({ ...form, puntaje: Number(e.target.value) })}
              className="w-full accent-[#1D2B53]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-500">Comentarios</label>
            <textarea
              value={form.comentarios}
              onChange={(e) => setForm({ ...form, comentarios: e.target.value })}
              rows={2}
              className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-[#1D2B53] focus:outline-none focus:ring-1 focus:ring-[#1D2B53]"
              placeholder="Observaciones de la evaluación"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={guardando}
              className="rounded-md bg-[#1D2B53] px-4 py-2 text-sm font-medium text-white hover:bg-[#16224A] disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Guardar evaluación"}
            </button>
          </div>
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
                  <p className="text-sm font-medium text-gray-800">{ETIQUETAS_TIPO[ev.tipo]}</p>
                  <p className="font-mono text-[11px] text-gray-400">
                    {ev.evaluador} · {new Date(ev.fecha).toLocaleDateString("es-PE")}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    ev.puntaje >= 80
                      ? "bg-emerald-50 text-emerald-700"
                      : ev.puntaje >= 60
                      ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {ev.puntaje}/100
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full bg-[#1D2B53]"
                  style={{ width: `${ev.puntaje}%` }}
                />
              </div>
              {ev.comentarios && (
                <p className="mt-2 text-sm text-gray-600">{ev.comentarios}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
