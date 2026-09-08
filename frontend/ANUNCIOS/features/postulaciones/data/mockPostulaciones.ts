import { Postulacion } from '../types';
import { anunciosMock } from '@/features/anuncios/data/anuncios.mock';

// Generate applications based on the announcements mock
export const MOCK_POSTULACIONES: Postulacion[] = [
  {
    id: 'post-1',
    anuncioId: anunciosMock[0].id,
    cargo: anunciosMock[0].titulo,
    empresa: anunciosMock[0].empresa.nombre,
    fechaPublicacion: anunciosMock[0].fechaPublicacion,
    fechaCierre: '2026-09-29T00:00:00Z',
    estadoProceso: 'En proceso',
    pasoActual: 1, // Postulado
  },
  {
    id: 'post-2',
    anuncioId: anunciosMock[1].id,
    cargo: anunciosMock[1].titulo,
    empresa: anunciosMock[1].empresa.nombre,
    fechaPublicacion: anunciosMock[1].fechaPublicacion,
    fechaCierre: '2026-09-15T00:00:00Z',
    estadoProceso: 'En proceso',
    pasoActual: 3, // Entrevista
  },
  {
    id: 'post-3',
    anuncioId: anunciosMock[2].id,
    cargo: anunciosMock[2].titulo,
    empresa: anunciosMock[2].empresa.nombre,
    fechaPublicacion: anunciosMock[2].fechaPublicacion,
    fechaCierre: '2026-10-30T00:00:00Z',
    estadoProceso: 'Finalizado',
    pasoActual: 5, // Contratado
  }
];
