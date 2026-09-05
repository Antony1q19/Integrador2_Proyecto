// features/anuncios/components/AnunciosBuscador.tsx
'use client';

import { Anuncio } from '../types';
import { useFiltroAnuncios } from '../hooks/useFiltroAnuncios';
import AnunciosExplorer from './AnunciosExplorer';
import SesionMenu from '@/features/shared/components/SesionMenu';

interface AnunciosBuscadorProps {
  anuncios: Anuncio[];
}

export default function AnunciosBuscador({ anuncios }: AnunciosBuscadorProps) {
  const { busqueda, setBusqueda, ubicacion, setUbicacion, anunciosFiltrados } =
    useFiltroAnuncios(anuncios);

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-purple-950 to-purple-900">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-10">
          <div className="flex items-start justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
              POSTULA YA
            </h1>
            <SesionMenu variant="dark" />
          </div>
        </div>
      </section>

      <div className="w-full flex justify-center my-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 flex flex-col sm:flex-row gap-2 w-full max-w-3xl">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Título del empleo, palabras clave"
            className="flex-1 px-4 py-2.5 text-sm text-gray-700 focus:outline-none"
          />
          <div className="hidden sm:block w-px bg-gray-200" />
          <input
            type="text"
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
            placeholder="Ubicación"
            className="flex-1 px-4 py-2.5 text-sm text-gray-700 focus:outline-none"
          />
          <button className="bg-purple-800 hover:bg-purple-900 text-white text-sm font-medium px-6 py-2.5 rounded-md transition-colors">
            Buscar empleos
          </button>
        </div>
      </div>

      <section className="max-w-[1600px] mx-auto px-6 md:px-10 py-8">
        <AnunciosExplorer anuncios={anunciosFiltrados} />
      </section>
    </main>
  );
}