// features/anuncios/types/index.ts

/**
 * Representa a la empresa que publica un anuncio de empleo.
 * La separamos de Anuncio porque una misma empresa puede
 * tener múltiples anuncios publicados.
 */
export interface Empresa {
  id: string;
  nombre: string;
  logoUrl: string;
  ubicacion: string;
  rubro: string; // ej. "Tecnología", "Retail", "Construcción"
}

/**
 * Estado del anuncio, útil para filtros o para mostrar
 * badges visuales (ej. "Nuevo", "Urgente").
 */
export type EstadoAnuncio = 'activo' | 'cerrado' | 'pausado';

/**
 * Modalidad de trabajo, común en portales tipo Computrabajo.
 */
export type ModalidadTrabajo = 'presencial' | 'remoto' | 'hibrido';

/**
 * Representa un anuncio/oferta de empleo individual.
 * Esta es la entidad principal que vamos a listar en la vista
 * principal y a mostrar en detalle en app/anuncios/[id]/page.tsx
 */
export interface Anuncio {
  id: string;
  titulo: string;
  empresa: Empresa;
  ubicacion: string;
  modalidad: ModalidadTrabajo;
  salarioMin?: number; // opcional: algunas empresas no publican el salario
  salarioMax?: number;
  descripcion: string;
  requisitos: string[];
  fechaPublicacion: string; // formato ISO, lo formatearemos después en utils/
  estado: EstadoAnuncio;
  destacado?: boolean; // para resaltar visualmente ("oferta destacada")
}

// features/anuncios/types/index.ts (continuación del mismo archivo)

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  avatarUrl?: string;
}

// features/auth/types/index.ts
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  avatarUrl?: string;
}