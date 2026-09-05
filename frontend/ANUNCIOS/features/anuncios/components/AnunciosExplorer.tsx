// features/anuncios/components/AnunciosExplorer.tsx
'use client';

import { useEffect, useState } from 'react';
import { Anuncio } from '../types';
import JobCard from './JobCard';
import JobDetailPanel from '@/features/anuncios/components/JobDetailPanel';

interface AnunciosExplorerProps {
  anuncios: Anuncio[];
}

export default function AnunciosExplorer({ anuncios }: AnunciosExplorerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    anuncios.length > 0 ? anuncios[0].id : null
  );

  useEffect(() => {
    const sigueExistiendo = anuncios.some((a) => a.id === selectedId);
    if (!sigueExistiendo) {
      setSelectedId(anuncios.length > 0 ? anuncios[0].id : null);
    }
  }, [anuncios, selectedId]);

  const anuncioSeleccionado = anuncios.find((a) => a.id === selectedId) ?? null;

  if (anuncios.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-base">
          No se encontraron anuncios que coincidan con tu búsqueda.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 items-start">
      {/* Columna izquierda: lista compacta */}
      <div className="flex flex-col gap-3 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto lg:pr-2">
        {anuncios.map((anuncio) => (
          <JobCard
            key={anuncio.id}
            anuncio={anuncio}
            isSelected={anuncio.id === selectedId}
            onClick={() => setSelectedId(anuncio.id)}
          />
        ))}
      </div>

      {/* Columna derecha: panel de detalle (oculto en móvil si no hay selección) */}
      <div className="hidden lg:block lg:sticky lg:top-4">
        {anuncioSeleccionado && <JobDetailPanel anuncio={anuncioSeleccionado} />}
      </div>
    </div>
  );
}