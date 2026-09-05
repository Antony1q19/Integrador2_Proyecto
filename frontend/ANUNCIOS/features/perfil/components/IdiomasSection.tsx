// features/perfil/components/IdiomasSection.tsx
'use client';

import { useState } from 'react';
import { Plus, X, Languages } from 'lucide-react';
import { IdiomaPerfil, NivelIdioma } from '../types';
import { SectionCard } from './SectionCard';

const ETIQUETAS_NIVEL: Record<NivelIdioma, string> = {
  BASICO: 'Básico',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
  NATIVO: 'Nativo',
};

interface IdiomasSectionProps {
  idiomas: IdiomaPerfil[];
  guardando: boolean;
  onAgregar: (idioma: Omit<IdiomaPerfil, 'id'>) => Promise<void>;
  onEliminar: (id: string) => Promise<void>;
}

export function IdiomasSection({ idiomas, guardando, onAgregar, onEliminar }: IdiomasSectionProps) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [nivel, setNivel] = useState<NivelIdioma>('INTERMEDIO');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    await onAgregar({ nombre: nombre.trim(), nivel });
    setNombre('');
    setNivel('INTERMEDIO');
    setMostrarForm(false);
  };

  return (
    <SectionCard
      titulo="Idiomas"
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
          className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50/60 p-4 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-500">Idioma</label>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Inglés"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 transition-colors duration-150 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-500">Nivel</label>
            <select
              value={nivel}
              onChange={(e) => setNivel(e.target.value as NivelIdioma)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 transition-colors duration-150 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            >
              {Object.entries(ETIQUETAS_NIVEL).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={guardando}
            className="rounded-md bg-purple-800 px-4 py-1.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 ease-out hover:bg-purple-900 active:scale-[0.97] disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </form>
      )}

      {idiomas.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">Aún no agregas idiomas.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {idiomas.map((i) => (
            <span
              key={i.id}
              className="inline-flex items-center gap-2 rounded-full bg-purple-50 py-1.5 pl-3 pr-2 text-sm text-purple-800"
            >
              <Languages size={13} />
              {i.nombre} · <span className="text-purple-600">{ETIQUETAS_NIVEL[i.nivel]}</span>
              <button
                onClick={() => onEliminar(i.id)}
                className="ml-1 rounded-full p-0.5 text-purple-400 transition-colors duration-150 hover:bg-purple-100 hover:text-purple-700 active:scale-90"
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
