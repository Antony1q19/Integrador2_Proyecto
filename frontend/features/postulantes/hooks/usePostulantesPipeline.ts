// features/postulantes/hooks/usePostulantesPipeline.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { EstadoProceso, Postulante } from "../types/postulante.types";
import { fetchPostulantes, updateEstado } from "../services/postulantesService";

// TODO: reemplazar por el usuario real de la sesión (features/auth/hooks/useAuth)
const USUARIO_ACTUAL = "Usuario RRHH";

interface UsePostulantesPipelineResult {
  postulantes: Postulante[];
  loading: boolean;
  error: string | null;
  moviendoId: string | null;
  moverEstado: (id: string, estado: EstadoProceso) => Promise<void>;
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
    cargar();
  }, [cargar]);

  const moverEstado = async (id: string, estado: EstadoProceso) => {
    setMoviendoId(id);
    try {
      const registro = await updateEstado(id, estado, USUARIO_ACTUAL);
      setPostulantes((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, estadoActual: estado, historialEstados: [...p.historialEstados, registro] }
            : p
        )
      );
    } finally {
      setMoviendoId(null);
    }
  };

  return { postulantes, loading, error, moviendoId, moverEstado };
}
