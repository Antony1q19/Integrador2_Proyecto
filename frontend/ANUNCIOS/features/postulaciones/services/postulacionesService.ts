// features/postulaciones/services/postulacionesService.ts
//
// Capa de servicio del historial de postulaciones. Llama a las rutas
// propias de Next.js (/api/procesos), que son las que hablan con el Gateway.
import { Postulacion, PostulacionApi } from '../types';

// --- Anuncios públicos: el navegador los pide a nuestro proxy (/api/anuncios) ---

interface AnuncioPublicoDto {
  id: number;
  cargo: string;
  empresaNombre: string;
  empresaSector: string | null;
  descripcion: string | null;
  requisitos: string | null;
  numeroVacantes: number;
  salarioMin: number | null;
  salarioMax: number | null;
  fechaLimite: string;
  fechaPublicacion: string;
}

interface AnuncioResumen {
  id: number;
  titulo: string;
  empresaNombre: string;
  fechaPublicacion: string;
  fechaLimite: string;
}

async function obtenerAnunciosResumen(): Promise<AnuncioResumen[]> {
  try {
    const respuesta = await fetch('/api/anuncios', { method: 'GET' });
    if (!respuesta.ok) return [];
    const dtos: AnuncioPublicoDto[] = await respuesta.json();
    return dtos.map((dto) => ({
      id: dto.id,
      titulo: dto.cargo,
      empresaNombre: dto.empresaNombre,
      fechaPublicacion: dto.fechaPublicacion,
      fechaLimite: dto.fechaLimite,
    }));
  } catch {
    return []; // si falla, el historial se muestra sin los detalles del anuncio
  }
}

// --- Postulaciones ---

export async function obtenerMisPostulaciones(): Promise<Postulacion[]> {
  // Se cargan en paralelo: mis postulaciones + los anuncios públicos
  const [respuesta, anuncios] = await Promise.all([
    fetch('/api/procesos', { method: 'GET' }),
    obtenerAnunciosResumen(),
  ]);

  if (respuesta.status === 401) {
    throw new Error('Debes iniciar sesión para ver tus postulaciones');
  }
  if (!respuesta.ok) {
    throw new Error('No se pudieron cargar tus postulaciones');
  }

  const datos: PostulacionApi[] = await respuesta.json();
  const anunciosPorId = new Map(anuncios.map((a) => [a.id, a]));

  return datos.map((dto) => mapearPostulacion(dto, anunciosPorId.get(dto.anuncioId)));
}

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

function mapearPostulacion(dto: PostulacionApi, anuncio?: AnuncioResumen): Postulacion {
  return {
    id: dto.id,
    anuncioId: String(dto.anuncioId),
    // Si tenemos el anuncio, mostramos su título/empresa; si no, un texto de respaldo.
    cargo: anuncio?.titulo ?? `Anuncio #${dto.anuncioId}`,
    empresa: anuncio?.empresaNombre ?? '',
    fechaPublicacion: anuncio?.fechaPublicacion ?? '',
    fechaCierre: anuncio?.fechaLimite ?? '',
    estadoProceso: ESTADO_A_UI[dto.estadoActual] ?? 'En proceso',
    pasoActual: PASOS_POR_ESTADO[dto.estadoActual] ?? 1,
    estadoActual: dto.estadoActual,
    fechaPostulacion: dto.fechaPostulacion,
  };
}