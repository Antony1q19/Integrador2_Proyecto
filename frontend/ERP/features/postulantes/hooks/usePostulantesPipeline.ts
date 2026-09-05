// features/postulantes/hooks/usePostulantesPipeline.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { EstadoProceso, Postulante } from "../types/postulante.types";
import { fetchPostulantes, actualizarEstadoPostulacion } from "../services/postulantesService";

// TODO: reemplazar por el usuario real de la sesión (features/auth/hooks/useAuth)
const USUARIO_ACTUAL = "Usuario RRHH";

interface UsePostulantesPipelineResult {
  postulantes: Postulante[];
  loading: boolean;
  error: string | null;
  // id compuesto "<postulanteId>:<anuncioId>" de la tarjeta que se está moviendo
  moviendoId: string | null;
  moverEstadoPostulacion: (postulanteId: string, anuncioId: string, estado: EstadoProceso) => Promise<void>;
}

export function usePostulantesPipeline(): UsePostulantesPipelineResult {
  const [postulantes, setPostulantes] = useState<Postulante[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moviendoId, setMoviendoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPostulantes();
      setPostulantes(data);
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

  return { postulantes, loading, error, moviendoId, moverEstadoPostulacion };
}
