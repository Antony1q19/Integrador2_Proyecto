// features/anuncios/hooks/useFiltroAnuncios.ts
import { useState, useMemo } from 'react';
import { Anuncio } from '../types';

// Filtra mientras se escribe, por puesto, empresa o rubro. (El filtro por ubicación se quitó
// porque los anuncios del backend todavía no tienen ubicación: no encontraba nada.)
export function useFiltroAnuncios(anuncios: Anuncio[]) {
  const [busqueda, setBusqueda] = useState('');

  const anunciosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (texto === '') return anuncios;
    return anuncios.filter(
      (anuncio) =>
        anuncio.titulo.toLowerCase().includes(texto) ||
        anuncio.empresa.nombre.toLowerCase().includes(texto) ||
        (anuncio.empresa.rubro ?? '').toLowerCase().includes(texto)
    );
  }, [anuncios, busqueda]);

  return { busqueda, setBusqueda, anunciosFiltrados };
}
