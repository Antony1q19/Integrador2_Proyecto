// features/perfil/components/ExperienciaSection.tsx
'use client';

import { useState } from 'react';
import { Plus, X, Trash2, Briefcase } from 'lucide-react';
import { ExperienciaLaboral } from '../types';
import { SectionCard } from './SectionCard';

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 transition-colors duration-150 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30';

interface ExperienciaSectionProps {
  experiencia: ExperienciaLaboral[];
  guardando: boolean;
  onAgregar: (experiencia: Omit<ExperienciaLaboral, 'id'>) => Promise<void>;
  onEliminar: (id: string) => Promise<void>;
}

const FORM_INICIAL = {
  empresa: '',
  cargo: '',
  fechaInicio: '',
  fechaFin: '',
  actualidad: false,
  descripcion: '',
};

export function ExperienciaSection({
  experiencia,
  guardando,
  onAgregar,
  onEliminar,
}: ExperienciaSectionProps) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAgregar({
      empresa: form.empresa,
      cargo: form.cargo,
      fechaInicio: form.fechaInicio,
      fechaFin: form.actualidad ? undefined : form.fechaFin || undefined,
      actualidad: form.actualidad,
      descripcion: form.descripcion || undefined,
    });
    setForm(FORM_INICIAL);
    setMostrarForm(false);
  };

  return (
    <SectionCard
      titulo="Experiencia laboral"
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
            <label className="mb-1 block text-xs font-medium text-gray-500">Empresa</label>
            <input
              required
              value={form.empresa}
              onChange={(e) => setForm({ ...form, empresa: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Cargo</label>
            <input
              required
              value={form.cargo}
              onChange={(e) => setForm({ ...form, cargo: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex items-end gap-3">
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
            {!form.actualidad && (
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
              checked={form.actualidad}
              onChange={(e) => setForm({ ...form, actualidad: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-purple-700 focus:ring-purple-500"
            />
            Trabajo actual
          </label>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Descripción (opcional)
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={2}
              className={inputClass}
            />
          </div>

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

      {experiencia.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">
          Aún no agregas experiencia laboral.
        </p>
      ) : (
        <ul className="space-y-3">
          {[...experiencia].reverse().map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 p-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                  <Briefcase size={16} />
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{e.cargo}</p>
                  <p className="text-sm text-gray-500">{e.empresa}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {e.fechaInicio} — {e.actualidad ? 'Actualidad' : e.fechaFin || '—'}
                  </p>
                  {e.descripcion && (
                    <p className="mt-1.5 text-sm text-gray-600">{e.descripcion}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => onEliminar(e.id)}
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
