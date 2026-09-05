// features/anuncios/components/AnunciosBuscador.tsx
'use client';

import { Search, MapPin } from 'lucide-react';
import { Anuncio } from '../types';
import { useFiltroAnuncios } from '../hooks/useFiltroAnuncios';
import AnunciosExplorer from './AnunciosExplorer';

interface AnunciosBuscadorProps {
  anuncios: Anuncio[];
}

export default function AnunciosBuscador({ anuncios }: AnunciosBuscadorProps) {
  const { busqueda, setBusqueda, ubicacion, setUbicacion, anunciosFiltrados } =
    useFiltroAnuncios(anuncios);

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-purple-950 via-purple-900 to-purple-800">
        <div className="mx-auto max-w-[1600px] px-6 py-14 md:px-10 md:py-20">
          <h1 className="animate-fade-in-up text-3xl font-bold text-white md:text-4xl">
            Encuentra tu próximo empleo
          </h1>
          <p
            className="animate-fade-in-up mt-2 max-w-xl text-sm text-purple-200 md:text-base"
            style={{ animationDelay: '60ms' }}
          >
            Explora ofertas verificadas y postula en minutos.
          </p>
        </div>
      </section>

      <div
        className="animate-fade-in-up relative z-10 mx-auto -mt-8 w-full max-w-3xl px-6"
        style={{ animationDelay: '120ms' }}
      >
        <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-lg sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Título del empleo, palabras clave"
              className="w-full py-2.5 pl-9 pr-3 text-sm text-gray-700 focus:outline-none"
            />
          </div>
          <div className="hidden w-px bg-gray-200 sm:block" />
          <div className="relative flex-1">
            <MapPin
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Ubicación"
              className="w-full py-2.5 pl-9 pr-3 text-sm text-gray-700 focus:outline-none"
            />
          </div>
          <button className="rounded-md bg-purple-800 px-6 py-2.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 ease-out hover:bg-purple-900 active:scale-[0.97]">
            Buscar empleos
          </button>
        </div>
      </div>

      <section className="mx-auto max-w-[1600px] px-6 py-8 md:px-10">
        <AnunciosExplorer anuncios={anunciosFiltrados} />
      </section>
    </main>
  );
}
