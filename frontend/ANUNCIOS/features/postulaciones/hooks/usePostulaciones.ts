'use client';

import { useState, useEffect } from 'react';
import { Postulacion } from '../types';
import { MOCK_POSTULACIONES } from '../data/mockPostulaciones';

export function usePostulaciones() {
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simular llamada a API
    const fetchPostulaciones = async () => {
      try {
        setLoading(true);
        // Simulamos un pequeño retraso de red
        await new Promise((resolve) => setTimeout(resolve, 800));
        setPostulaciones(MOCK_POSTULACIONES);
      } catch (err) {
        setError('Ocurrió un error al cargar el historial de postulaciones.');
      } finally {
        setLoading(false);
      }
    };

    fetchPostulaciones();
  }, []);

  return {
    postulaciones,
    loading,
    error,
  };
}
