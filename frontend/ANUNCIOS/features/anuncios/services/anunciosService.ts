// features/anuncios/services/anunciosService.ts
//
// Anuncios PÚBLICOS (no hace falta iniciar sesión para verlos).
//
// SOLO se usa desde el SERVIDOR de Next.js (páginas en app/, que son Server Components): el
// navegador nunca llama al Gateway directo. Por eso la dirección viene de GATEWAY_INTERNAL_URL
// (sin el prefijo NEXT_PUBLIC_, así no se filtra al código que descarga el navegador).
//
// Ruta del Gateway: GET /api/v1/publico/anuncios  (solo anuncios abiertos y vigentes, con campos
// públicos; ver backend/gateway/app/api/v1/publico.py).
import { Anuncio } from '../types';

const GATEWAY_URL = process.env.GATEWAY_INTERNAL_URL;

// Next.js guarda la respuesta 60 s y la reutiliza entre visitas: así casi ninguna visita llega al
// backend (y no choca con el límite de peticiones por IP del Gateway).
const SEGUNDOS_EN_CACHE = 60;

// Lo que responde el backend (AnuncioPublico en servicio-empresas-vacantes/app/schemas/anuncio.py).
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

// El backend guarda los requisitos como un solo texto; aquí se muestra uno por línea.
function separarRequisitos(texto: string | null): string[] {
  return (texto ?? '')
    .split(/\r?\n/)
    .map((linea) => linea.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}

function mapearAnuncio(dto: AnuncioPublicoDto): Anuncio {
  return {
    id: String(dto.id),
    titulo: dto.cargo,
    empresa: {
      // El backend no expone el id de la empresa al público: se usa su nombre como clave.
      id: dto.empresaNombre,
      nombre: dto.empresaNombre,
      rubro: dto.empresaSector ?? undefined,
    },
    salarioMin: dto.salarioMin ?? undefined,
    salarioMax: dto.salarioMax ?? undefined,
    descripcion: dto.descripcion ?? '',
    requisitos: separarRequisitos(dto.requisitos),
    numeroVacantes: dto.numeroVacantes,
    fechaLimite: dto.fechaLimite,
    fechaPublicacion: dto.fechaPublicacion,
    estado: 'activo',
  };
}

async function pedirAlGateway(ruta: string): Promise<Response> {
  if (!GATEWAY_URL) {
    throw new Error('GATEWAY_INTERNAL_URL no está configurada en el servidor de ANUNCIOS');
  }
  return fetch(`${GATEWAY_URL}${ruta}`, { next: { revalidate: SEGUNDOS_EN_CACHE } });
}

/** Los anuncios publicados, los más recientes primero. Lanza error si el backend no responde. */
export async function obtenerAnunciosPublicos(): Promise<Anuncio[]> {
  const respuesta = await pedirAlGateway('/publico/anuncios?limite=100');
  if (!respuesta.ok) throw new Error(`El backend respondió ${respuesta.status} al pedir los anuncios`);
  const dtos: AnuncioPublicoDto[] = await respuesta.json();
  return dtos.map(mapearAnuncio);
}

/** Un anuncio publicado, o null si no existe / ya no está abierto (404). */
export async function obtenerAnuncioPublico(id: string): Promise<Anuncio | null> {
  // Solo ids numéricos: cualquier otra cosa ni se envía al backend.
  if (!/^\d+$/.test(id)) return null;
  const respuesta = await pedirAlGateway(`/publico/anuncios/${id}`);
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new Error(`El backend respondió ${respuesta.status} al pedir el anuncio ${id}`);
  return mapearAnuncio(await respuesta.json());
}
