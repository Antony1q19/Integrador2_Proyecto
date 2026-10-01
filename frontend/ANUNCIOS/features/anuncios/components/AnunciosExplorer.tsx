// features/anuncios/components/AnunciosExplorer.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Anuncio } from '../types';
import JobCard from './JobCard';
import JobDetailPanel from '@/features/anuncios/components/JobDetailPanel';

interface AnunciosExplorerProps {
  anuncios: Anuncio[];
}

// Desde este ancho (lg de Tailwind) se ve el panel de detalle a la derecha.
const MEDIA_ESCRITORIO = '(min-width: 1024px)';

export default function AnunciosExplorer({ anuncios }: AnunciosExplorerProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Si el elegido ya no está en la lista (ej. por el filtro de búsqueda), se muestra el primero.
  // Se calcula al vuelo en vez de corregir el estado en un useEffect.
  const anuncioSeleccionado = anuncios.find((a) => a.id === selectedId) ?? anuncios[0] ?? null;

  // En escritorio se muestra el detalle al costado; en celular el panel no cabe, así que se abre
  // la página del anuncio (/anuncios/[id]).
  const abrirAnuncio = (anuncio: Anuncio) => {
    if (window.matchMedia(MEDIA_ESCRITORIO).matches) {
      setSelectedId(anuncio.id);
    } else {
      router.push(`/anuncios/${anuncio.id}`);
    }
  };

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
            isSelected={anuncio.id === anuncioSeleccionado?.id}
            onClick={() => abrirAnuncio(anuncio)}
          />
        ))}
      </div>

      {/* Columna derecha: panel de detalle (solo escritorio; en celular se abre la página del anuncio) */}
      <div className="hidden lg:block lg:sticky lg:top-4">
        {anuncioSeleccionado && <JobDetailPanel anuncio={anuncioSeleccionado} />}
      </div>
    </div>
  );
}
