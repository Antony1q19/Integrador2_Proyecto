// features/perfil/components/ResumenProfesionalSection.tsx
'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { SectionCard } from './SectionCard';

interface ResumenProfesionalSectionProps {
  resumen: string;
  guardando: boolean;
  onGuardar: (resumen: string) => Promise<void>;
}

export function ResumenProfesionalSection({
  resumen,
  guardando,
  onGuardar,
}: ResumenProfesionalSectionProps) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(resumen);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGuardar(texto);
    setEditando(false);
  };

  return (
    <SectionCard
      titulo="Resumen profesional"
      accion={
        !editando && (
          <button
            onClick={() => {
              setTexto(resumen);
              setEditando(true);
            }}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-purple-700 transition-colors duration-150 hover:bg-purple-50 active:scale-[0.97]"
          >
            <Pencil size={13} /> Editar
          </button>
        )
      }
    >
      {editando ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            maxLength={600}
            placeholder="Cuéntale a las empresas quién eres y qué buscas…"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 transition-colors duration-150 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{texto.length}/600</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-600 transition-colors duration-150 hover:bg-gray-50 active:scale-[0.97]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="rounded-md bg-purple-800 px-4 py-1.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 ease-out hover:bg-purple-900 active:scale-[0.97] disabled:opacity-50"
              >
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </form>
      ) : resumen ? (
        <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{resumen}</p>
      ) : (
        <p className="text-sm text-gray-400">Aún no agregas un resumen profesional.</p>
      )}
    </SectionCard>
  );
}
