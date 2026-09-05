// features/perfil/components/FormacionAcademicaSection.tsx
'use client';

import { useState } from 'react';
import { Plus, X, Trash2, GraduationCap } from 'lucide-react';
import { FormacionAcademica, NivelFormacion } from '../types';
import { SectionCard } from './SectionCard';

const ETIQUETAS_NIVEL: Record<NivelFormacion, string> = {
  SECUNDARIA: 'Secundaria',
  TECNICO: 'Técnico',
  UNIVERSITARIO: 'Universitario',
  POSTGRADO: 'Postgrado',
  OTRO: 'Otro',
};

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 transition-colors duration-150 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30';

interface FormacionAcademicaSectionProps {
  formacion: FormacionAcademica[];
  guardando: boolean;
  onAgregar: (formacion: Omit<FormacionAcademica, 'id'>) => Promise<void>;
  onEliminar: (id: string) => Promise<void>;
}

const FORM_INICIAL = {
  institucion: '',
  titulo: '',
  nivel: 'UNIVERSITARIO' as NivelFormacion,
  fechaInicio: '',
  fechaFin: '',
  enCurso: false,
};

export function FormacionAcademicaSection({
  formacion,
  guardando,
  onAgregar,
  onEliminar,
}: FormacionAcademicaSectionProps) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAgregar({
      institucion: form.institucion,
      titulo: form.titulo,
      nivel: form.nivel,
      fechaInicio: form.fechaInicio,
      fechaFin: form.enCurso ? undefined : form.fechaFin || undefined,
      enCurso: form.enCurso,
    });
    setForm(FORM_INICIAL);
    setMostrarForm(false);
  };

  return (
    <SectionCard
      titulo="Formación académica"
      accion={
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-purple-700 transition-colors duration-150 hover:bg-purple-50 active:scale-[0.97]"
        >
          {mostrarForm ? <X size={13} /> : <Plus size={13} />} {mostrarForm ? 'Cancelar' : 'Agregar'}
        </button>
      }
    >
      {mostrarForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50/60 p-4 sm:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Institución</label>
            <input
              required
              value={form.institucion}
              onChange={(e) => setForm({ ...form, institucion: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Título / carrera</label>
            <input
              required
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Nivel</label>
            <select
              value={form.nivel}
              onChange={(e) => setForm({ ...form, nivel: e.target.value as NivelFormacion })}
              className={inputClass}
            >
              {Object.entries(ETIQUETAS_NIVEL).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-3 sm:col-span-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-500">Inicio</label>
              <input
                required
                type="month"
                value={form.fechaInicio}
                onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                className={inputClass}
              />
            </div>
            {!form.enCurso && (
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-500">Fin</label>
                <input
                  type="month"
                  value={form.fechaFin}
                  onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                  className={inputClass}
                />
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.enCurso}
              onChange={(e) => setForm({ ...form, enCurso: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-purple-700 focus:ring-purple-500"
            />
            En curso actualmente
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={guardando}
              className="rounded-md bg-purple-800 px-4 py-1.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 ease-out hover:bg-purple-900 active:scale-[0.97] disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {formacion.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">
          Aún no agregas formación académica.
        </p>
      ) : (
        <ul className="space-y-3">
          {[...formacion].reverse().map((f) => (
            <li key={f.id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 p-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                  <GraduationCap size={16} />
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{f.titulo}</p>
                  <p className="text-sm text-gray-500">{f.institucion}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {ETIQUETAS_NIVEL[f.nivel]} · {f.fechaInicio} — {f.enCurso ? 'Actualidad' : f.fechaFin || '—'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onEliminar(f.id)}
                className="rounded-md p-1.5 text-gray-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-600 active:scale-[0.97]"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
