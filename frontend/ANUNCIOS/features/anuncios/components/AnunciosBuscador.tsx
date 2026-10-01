// features/anuncios/components/AnunciosBuscador.tsx
'use client';

import { Search } from 'lucide-react';
import { Anuncio } from '../types';
import { useFiltroAnuncios } from '../hooks/useFiltroAnuncios';
import AnunciosExplorer from './AnunciosExplorer';

interface AnunciosBuscadorProps {
  anuncios: Anuncio[];
}

export default function AnunciosBuscador({ anuncios }: AnunciosBuscadorProps) {
  const { busqueda, setBusqueda, anunciosFiltrados } = useFiltroAnuncios(anuncios);

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
        <div className="mx-auto max-w-[1600px] px-6 py-14 md:px-10 md:py-20">
          <h1 className="animate-fade-in-up text-3xl font-bold text-white md:text-4xl">
            Encuentra tu próximo empleo
          </h1>
          <p
            className="animate-fade-in-up mt-2 max-w-xl text-sm text-primary-200 md:text-base"
            style={{ animationDelay: '60ms' }}
          >
            Explora las ofertas de nuestras empresas clientes y postula en minutos.
          </p>
        </div>
      </section>

      <div
        className="animate-fade-in-up relative z-10 mx-auto -mt-8 w-full max-w-3xl px-6"
        style={{ animationDelay: '120ms' }}
      >
        <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
          {/* Se filtra mientras se escribe: no hace falta un botón "Buscar". */}
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <label htmlFor="buscar-empleo" className="sr-only">
              Buscar empleo
            </label>
            <input
              id="buscar-empleo"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Puesto, empresa o palabra clave"
              className="w-full rounded-lg py-2.5 pl-9 pr-3 text-sm text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
            />
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-[1600px] px-6 py-8 md:px-10">
        <AnunciosExplorer anuncios={anunciosFiltrados} />
      </section>
    </main>
  );
}
