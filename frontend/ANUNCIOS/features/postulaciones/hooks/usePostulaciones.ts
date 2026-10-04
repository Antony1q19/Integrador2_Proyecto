// features/postulaciones/hooks/usePostulaciones.ts
'use client';

import { useState } from 'react';
import { Postulacion } from '../types';

export function usePostulaciones() {
  // Estado real sin datos simulados ni temporizadores; listo para conectar al backend en la siguiente fase
  const [postulaciones] = useState<Postulacion[]>([]);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  return {
    postulaciones,
    loading,
    error,
  };
}
