// features/postulaciones/hooks/usePostulaciones.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Postulacion } from '../types';
import { obtenerMisPostulaciones } from '../services/postulacionesService';

export function usePostulaciones() {
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const datos = await obtenerMisPostulaciones();
      setPostulaciones(datos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las postulaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    void cargar();
  }, [cargar]);

  return {
    postulaciones,
    loading,
    error,
    recargar: cargar,
  };
}