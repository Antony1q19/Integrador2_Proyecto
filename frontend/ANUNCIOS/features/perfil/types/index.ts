// features/perfil/types/index.ts
//
// Modelo del perfil del postulante. Pensado para calzar con una respuesta
// típica de una API (id como string/UUID, fechas en formato ISO). Cuando se
// conecte el backend real, este archivo no debería requerir cambios de
// forma, solo ajustar nombres si el DTO difiere.

export type TipoDocumento = 'DNI' | 'CE' | 'PASAPORTE';

export type NivelFormacion = 'SECUNDARIA' | 'TECNICO' | 'UNIVERSITARIO' | 'POSTGRADO' | 'OTRO';

export type NivelIdioma = 'BASICO' | 'INTERMEDIO' | 'AVANZADO' | 'NATIVO';

export interface DatosPersonalesPerfil {
  nombres: string;
  apellidos: string;
  documentoTipo: TipoDocumento;
  documentoNumero: string;
  email: string;
  telefono: string;
  fechaNacimiento: string; // ISO date
  direccion?: string;
}

export interface CurriculumAdjunto {
  nombreArchivo: string;
  tamanioKb: number;
  fechaCarga: string; // ISO datetime
  url?: string; // objectURL local mientras no hay storage real
}

export interface FormacionAcademica {
  id: string;
  institucion: string;
  titulo: string;
  nivel: NivelFormacion;
  fechaInicio: string; // ISO date (yyyy-mm)
  fechaFin?: string; // vacío si "enCurso"
  enCurso: boolean;
}

export interface IdiomaPerfil {
  id: string;
  nombre: string;
  nivel: NivelIdioma;
}

export interface ExperienciaLaboral {
  id: string;
  empresa: string;
  cargo: string;
  fechaInicio: string; // ISO date (yyyy-mm)
  fechaFin?: string; // vacío si "actualidad"
  actualidad: boolean;
  descripcion?: string;
}

// Consentimientos de tratamiento de datos personales (Ley N.º 29733 y su
// reglamento). "tratamientoDatos" es la base legal para usar la cuenta —
// obligatorio, no puede crearse la cuenta sin él. "comunicacionesComerciales"
// es independiente y opcional: no se puede condicionar el registro a que el
// titular acepte publicidad, ofertas o campañas de captación.
export interface ConsentimientosPerfil {
  tratamientoDatos: boolean;
  comunicacionesComerciales: boolean;
  fechaAceptacion: string; // ISO datetime — cuándo se otorgó el consentimiento
}

export interface PerfilPostulante {
  id: string;
  fotoUrl?: string;
  datosPersonales: DatosPersonalesPerfil;
  cv?: CurriculumAdjunto;
  resumenProfesional: string;
  formacionAcademica: FormacionAcademica[];
  idiomas: IdiomaPerfil[];
  experiencia: ExperienciaLaboral[];
  consentimientos: ConsentimientosPerfil;
}
