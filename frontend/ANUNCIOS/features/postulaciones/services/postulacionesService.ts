// features/postulaciones/services/postulacionesService.ts
//
// Capa de servicio del historial de postulaciones. Llama a las rutas
// propias de Next.js (/api/procesos), que son las que hablan con el Gateway.
import { Postulacion, PostulacionApi } from '../types';

/**
 * Lista las postulaciones del postulante autenticado (lee el JWT de la cookie).
 */
export async function obtenerMisPostulaciones(): Promise<Postulacion[]> {
  const respuesta = await fetch('/api/procesos', { method: 'GET' });

  if (respuesta.status === 401) {
    throw new Error('Debes iniciar sesión para ver tus postulaciones');
  }
  if (!respuesta.ok) {
    throw new Error('No se pudieron cargar tus postulaciones');
  }

  const datos: PostulacionApi[] = await respuesta.json();
  return datos.map(mapearPostulacion);
}

/**
 * Crea una postulación del postulante autenticado a un anuncio.
 * El backend obtiene el postulanteId del token, no del cuerpo.
 */
export async function postularseAAnuncio(params: {
  anuncioId: number;
  postulanteId: string;
}): Promise<PostulacionApi> {
  const respuesta = await fetch('/api/procesos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (respuesta.status === 401) {
    throw new Error('Debes iniciar sesión para postularte');
  }

  const data = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(data?.error ?? 'No se pudo completar la postulación');
  }

  return data as PostulacionApi;
}

// ============================================================
// Mapeo del formato del backend (ProcesoRespuesta) al de la UI
// ============================================================
const PASOS_POR_ESTADO: Record<string, number> = {
  POSTULADO: 1,
  EN_EVALUACION: 2,
  ENTREVISTA: 3,
  PRESELECCIONADO: 4,
  CONTRATADO: 5,
  DESCARTADO: 5,
};

const ESTADO_A_UI: Record<string, 'En proceso' | 'Finalizado' | 'Cancelado'> = {
  POSTULADO: 'En proceso',
  EN_EVALUACION: 'En proceso',
  ENTREVISTA: 'En proceso',
  PRESELECCIONADO: 'En proceso',
  CONTRATADO: 'Finalizado',
  DESCARTADO: 'Cancelado',
};

function mapearPostulacion(dto: PostulacionApi): Postulacion {
  return {
    id: dto.id,
    anuncioId: String(dto.anuncioId),
    cargo: '',
    empresa: '',
    fechaPublicacion: '',
    fechaCierre: '',
    estadoProceso: ESTADO_A_UI[dto.estadoActual] ?? 'En proceso',
    pasoActual: PASOS_POR_ESTADO[dto.estadoActual] ?? 1,
    estadoActual: dto.estadoActual,
    fechaPostulacion: dto.fechaPostulacion,
  };
}