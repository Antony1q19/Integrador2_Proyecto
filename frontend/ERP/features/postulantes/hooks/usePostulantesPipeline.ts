// features/postulantes/hooks/usePostulantesPipeline.ts
"use client";

import { useMemo, useState } from "react";
import { Anuncio } from "@/features/anuncios/types/anuncio";
import { actualizarCache, useCargaConCache } from "@/lib/cacheCliente";
import { EstadoProceso, HistorialEstado, Postulante } from "../types/postulante.types";
import { fetchPostulantes, fetchAnuncios, actualizarEstadoPostulacion } from "../services/postulantesService";

// Nombre para el historial en modo mock; con backend lo pone el servidor (la cuenta con sesión).
const USUARIO_ACTUAL = "Usuario RRHH";

interface UsePostulantesPipelineResult {
  postulantes: Postulante[];
  anuncios: Anuncio[];
  loading: boolean;
  error: string | null;
  // id compuesto "<postulanteId>:<anuncioId>" de la tarjeta que se está moviendo
  moviendoId: string | null;
  moverEstadoPostulacion: (postulanteId: string, anuncioId: string, estado: EstadoProceso) => Promise<void>;
  recargar: () => Promise<void>;
}

// Aplica un cambio de etapa (ya confirmado por el servidor) a la lista de postulantes.
function conEstado(lista: Postulante[], postulanteId: string, anuncioId: string, estado: EstadoProceso, registro: HistorialEstado) {
  return lista.map((p) => {
    if (p.id !== postulanteId) return p;
    const historialPrevio = p.procesosPostulacion[anuncioId]?.historialEstados ?? [];
    return {
      ...p,
      estadoActual: estado,
      procesosPostulacion: {
        ...p.procesosPostulacion,
        [anuncioId]: { estadoActual: estado, historialEstados: [...historialPrevio, registro] },
      },
    };
  });
}

export function usePostulantesPipeline(): UsePostulantesPipelineResult {
  // Las dos listas se recuerdan entre visitas (ver lib/cacheCliente.ts): al volver, el tablero aparece al instante.
  const lista = useCargaConCache<Postulante[]>("postulantes:lista", fetchPostulantes);
  const anuncios = useCargaConCache<Anuncio[]>("anuncios:lista", fetchAnuncios, 30_000);

  // Cambios "en vuelo": una tarjeta arrastrada se mueve AL INSTANTE (optimista), sin esperar la respuesta del
  // servidor (que tarda unos cientos de ms). Si el servidor rechaza el cambio, la tarjeta vuelve a su lugar.
  // clave: "<postulanteId>:<anuncioId>" -> etapa a la que se movió
  const [enVuelo, setEnVuelo] = useState<Record<string, EstadoProceso>>({});

  const postulantes = useMemo(() => {
    const base = lista.datos ?? [];
    const claves = Object.keys(enVuelo);
    if (claves.length === 0) return base;
    return base.map((p) => {
      const cambios = claves.filter((c) => c.startsWith(`${p.id}:`));
      if (cambios.length === 0) return p;
      const procesos = { ...p.procesosPostulacion };
      for (const clave of cambios) {
        const anuncioId = clave.slice(p.id.length + 1);
        procesos[anuncioId] = { estadoActual: enVuelo[clave], historialEstados: procesos[anuncioId]?.historialEstados ?? [] };
      }
      return { ...p, procesosPostulacion: procesos };
    });
  }, [lista.datos, enVuelo]);

  const moverEstadoPostulacion = async (postulanteId: string, anuncioId: string, estado: EstadoProceso) => {
    const clave = `${postulanteId}:${anuncioId}`;
    setEnVuelo((previo) => ({ ...previo, [clave]: estado })); // 1) se mueve ya
    try {
      const registro = await actualizarEstadoPostulacion(postulanteId, anuncioId, estado, USUARIO_ACTUAL);
      // 2) confirmado: el cambio pasa a la lista guardada (la misma que usa /postulantes)
      actualizarCache<Postulante[]>("postulantes:lista", (actual) => conEstado(actual, postulanteId, anuncioId, estado, registro));
    } finally {
      // 3) haya salido bien o mal, deja de ser "en vuelo": si salió bien ya está en la lista; si salió mal, se revierte
      setEnVuelo((previo) => {
        const { [clave]: _quitada, ...resto } = previo;
        void _quitada;
        return resto;
      });
    }
  };

  const moviendoId = Object.keys(enVuelo)[0] ?? null;
  return {
    postulantes,
    anuncios: anuncios.datos ?? [],
    loading: lista.cargando || anuncios.cargando,
    error: lista.error ?? anuncios.error,
    moviendoId,
    moverEstadoPostulacion,
    recargar: lista.recargar,
  };
}
