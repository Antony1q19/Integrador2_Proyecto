// features/postulantes/hooks/usePostulanteDetalle.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Postulante,
  DatosPersonales,
  DocumentoPostulante,
  Evaluacion,
  EstadoProceso,
} from "../types/postulante.types";
import {
  fetchPostulanteById,
  updateDatosPersonales,
  addDocumento,
  deleteDocumento,
  addEvaluacion,
  updateEstado,
} from "../services/postulantesService";

interface UsePostulanteDetalleResult {
  postulante: Postulante | null;
  loading: boolean;
  error: string | null;
  guardarDatosPersonales: (datos: DatosPersonales) => Promise<void>;
  subirDocumento: (archivo: File, tipo: DocumentoPostulante["tipo"]) => Promise<void>;
  eliminarDocumento: (documentoId: string) => Promise<void>;
  registrarEvaluacion: (evaluacion: Omit<Evaluacion, "id">) => Promise<void>;
  cambiarEstado: (estado: EstadoProceso, comentario?: string) => Promise<void>;
  guardando: boolean;
}

// TODO: reemplazar por el usuario real de la sesión (features/auth/hooks/useAuth)
const USUARIO_ACTUAL = "Usuario RRHH";

export function usePostulanteDetalle(id: string): UsePostulanteDetalleResult {
  const [postulante, setPostulante] = useState<Postulante | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPostulanteById(id);
      setPostulante(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el postulante");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardarDatosPersonales = async (datos: DatosPersonales) => {
    setGuardando(true);
    try {
      const actualizado = await updateDatosPersonales(id, datos);
      setPostulante(actualizado);
    } finally {
      setGuardando(false);
    }
  };

  const subirDocumento = async (archivo: File, tipo: DocumentoPostulante["tipo"]) => {
    setGuardando(true);
    try {
      const nuevoDocumento = await addDocumento(id, archivo, tipo);
      setPostulante((prev) =>
        prev ? { ...prev, documentos: [...prev.documentos, nuevoDocumento] } : prev
      );
    } finally {
      setGuardando(false);
    }
  };

  const eliminarDocumento = async (documentoId: string) => {
    await deleteDocumento(id, documentoId);
    setPostulante((prev) =>
      prev ? { ...prev, documentos: prev.documentos.filter((d) => d.id !== documentoId) } : prev
    );
  };

  const registrarEvaluacion = async (evaluacion: Omit<Evaluacion, "id">) => {
    setGuardando(true);
    try {
      const nueva = await addEvaluacion(id, evaluacion);
      setPostulante((prev) =>
        prev ? { ...prev, evaluaciones: [...prev.evaluaciones, nueva] } : prev
      );
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (estado: EstadoProceso, comentario?: string) => {
    setGuardando(true);
    try {
      const registro = await updateEstado(id, estado, USUARIO_ACTUAL, comentario);
      setPostulante((prev) =>
        prev
          ? { ...prev, estadoActual: estado, historialEstados: [...prev.historialEstados, registro] }
          : prev
      );
    } finally {
      setGuardando(false);
    }
  };

  return {
    postulante,
    loading,
    error,
    guardarDatosPersonales,
    subirDocumento,
    eliminarDocumento,
    registrarEvaluacion,
    cambiarEstado,
    guardando,
  };
}
