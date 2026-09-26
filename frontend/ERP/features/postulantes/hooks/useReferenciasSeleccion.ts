// features/postulantes/hooks/useReferenciasSeleccion.ts
"use client";

import { useMemo } from "react";
import { Anuncio } from "@/features/anuncios/types/anuncio";
import { useCargaConCache } from "@/lib/cacheCliente";
import { fetchAnuncios, fetchPostulantes } from "../services/postulantesService";
import { Postulante } from "../types/postulante.types";

// Los datos de "apoyo" que necesitan las pantallas de entrevistas y contrataciones para mostrar NOMBRES en vez
// de ids: los postulantes (y en qué anuncios postularon) y los anuncios (cargo y empresa). Vienen de la memoria
// del navegador, así que casi siempre están al instante.
export function useReferenciasSeleccion() {
  const postulantes = useCargaConCache<Postulante[]>("postulantes:lista", fetchPostulantes);
  const anuncios = useCargaConCache<Anuncio[]>("anuncios:lista", fetchAnuncios, 30_000);

  return useMemo(() => {
    const listaPostulantes = postulantes.datos ?? [];
    const listaAnuncios = anuncios.datos ?? [];
    const postulantePorId = new Map(listaPostulantes.map((p) => [p.id, p]));
    const anuncioPorId = new Map(listaAnuncios.map((a) => [a.id, a]));
    return {
      postulantes: listaPostulantes,
      anuncios: listaAnuncios,
      cargando: postulantes.cargando || anuncios.cargando,
      error: postulantes.error ?? anuncios.error,
      nombrePostulante: (id: string) => {
        const p = postulantePorId.get(id);
        return p ? `${p.datosPersonales.nombres} ${p.datosPersonales.apellidos}` : "Postulante";
      },
      vacante: (anuncioId: number) => {
        const a = anuncioPorId.get(anuncioId);
        return a ? { cargo: a.cargo, empresa: a.empresaRazonSocial } : { cargo: "Vacante", empresa: "" };
      },
    };
  }, [postulantes.datos, postulantes.cargando, postulantes.error, anuncios.datos, anuncios.cargando, anuncios.error]);
}
