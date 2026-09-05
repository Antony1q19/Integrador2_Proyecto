// features/anuncios/hooks/useFiltroAnuncios.ts
import { useState, useMemo } from 'react';
import { Anuncio } from '../types';

export function useFiltroAnuncios(anuncios: Anuncio[]) {
  const [busqueda, setBusqueda] = useState('');
  const [ubicacion, setUbicacion] = useState('');

  const anunciosFiltrados = useMemo(() => {
    return anuncios.filter((anuncio) => {
      const texto = busqueda.trim().toLowerCase();
      const coincideBusqueda =
        texto === '' ||
        anuncio.titulo.toLowerCase().includes(texto) ||
        anuncio.empresa.nombre.toLowerCase().includes(texto);

      const lugar = ubicacion.trim().toLowerCase();
      const coincideUbicacion =
        lugar === '' || anuncio.ubicacion.toLowerCase().includes(lugar);

      return coincideBusqueda && coincideUbicacion;
    });
  }, [anuncios, busqueda, ubicacion]);

  return { busqueda, setBusqueda, ubicacion, setUbicacion, anunciosFiltrados };
}