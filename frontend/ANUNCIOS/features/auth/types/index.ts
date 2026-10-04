// features/auth/types/index.ts
export interface Usuario {
  id: string;
  postulanteId: string;
  nombre: string;
  nombres?: string;
  apellidos?: string;
  email: string;
  telefono?: string | null;
  documentoTipo?: string;
  documentoNumero?: string;
  avatarUrl?: string;
  requiereAceptarTerminos?: boolean;
  versionTerminos?: string | null;
}

export interface DatosRegistroPostulante {
  nombres: string;
  apellidos: string;
  documentoTipo: string;
  documentoNumero: string;
  email: string;
  telefono?: string;
  fechaNacimiento?: string;
  password: string;
  aceptaTratamientoDatos: boolean;
  aceptaComunicaciones: boolean;
}