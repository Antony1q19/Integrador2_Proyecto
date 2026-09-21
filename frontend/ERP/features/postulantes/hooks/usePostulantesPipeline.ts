// features/postulantes/hooks/usePostulantesPipeline.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { Anuncio } from "@/features/anuncios/types/anuncio";
import { EstadoProceso, Postulante } from "../types/postulante.types";
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
}

export function usePostulantesPipeline(): UsePostulantesPipelineResult {
  const [postulantes, setPostulantes] = useState<Postulante[]>([]);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moviendoId, setMoviendoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Los postulantes (con sus postulaciones) y los anuncios se piden a la vez: los
      // anuncios dan el cargo y la empresa que se muestran en cada tarjeta.
      const [dataPostulantes, dataAnuncios] = await Promise.all([fetchPostulantes(), fetchAnuncios()]);
      setPostulantes(dataPostulantes);
      setAnuncios(dataAnuncios);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar los postulantes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial al montar (patrón estándar de fetch-en-efecto). `cargar` ya
    // arranca en loading=true por defecto, por eso el setState inicial es intencional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const moverEstadoPostulacion = async (postulanteId: string, anuncioId: string, estado: EstadoProceso) => {
    setMoviendoId(`${postulanteId}:${anuncioId}`);
    try {
      const registro = await actualizarEstadoPostulacion(postulanteId, anuncioId, estado, USUARIO_ACTUAL);
      setPostulantes((prev) =>
        prev.map((p) => {
          if (p.id !== postulanteId) return p;
          const historialPrevio = p.procesosPostulacion[anuncioId]?.historialEstados ?? [];
          return {
            ...p,
            procesosPostulacion: {
              ...p.procesosPostulacion,
              [anuncioId]: { estadoActual: estado, historialEstados: [...historialPrevio, registro] },
            },
          };
        })
      );
    } finally {
      setMoviendoId(null);
    }
  };

  return { postulantes, anuncios, loading, error, moviendoId, moverEstadoPostulacion };
}
