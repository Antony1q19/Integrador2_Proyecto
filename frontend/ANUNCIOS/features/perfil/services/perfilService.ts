// features/perfil/services/perfilService.ts
//
// Capa de servicio. Este es el ÚNICO lugar que debe cambiar cuando se
// conecte el backend real. Hoy lee/muta `mockPerfil.ts` (una pequeña "base
// de datos" en memoria con 3 cuentas) simulando latencia de red; mañana hace
// fetch() al endpoint real usando el id de la sesión autenticada en vez de
// `perfilActivoId`.
//
// Para integrar: comentar/eliminar el bloque "MODO MOCK" y descomentar el
// bloque "MODO API" de cada función. Los hooks y componentes que consumen
// este servicio NO se tocan.

import {
  PerfilPostulante,
  DatosPersonalesPerfil,
  CurriculumAdjunto,
  FormacionAcademica,
  IdiomaPerfil,
  ExperienciaLaboral,
  ConsentimientosPerfil,
} from '../types';
export interface DatosRegistro {
  datosPersonales: DatosPersonalesPerfil;
  consentimientos: Omit<ConsentimientosPerfil, 'fechaAceptacion'>;
}

export async function registrarCuenta(datos: DatosRegistro): Promise<PerfilPostulante> {
  const res = await fetch('/api/auth/registro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  if (!res.ok) throw new Error('Error al crear la cuenta');
  return res.json();
}

export async function fetchPerfil(): Promise<PerfilPostulante> {
  const res = await fetch('/api/auth/me');
  if (!res.ok) throw new Error('Error al obtener el perfil');
  const body = await res.json();
  const data = body.usuario;
  
  // Mapeamos MePostulanteRespuesta a PerfilPostulante
  return {
    id: data.postulanteId,
    datosPersonales: {
      nombres: data.nombres || '',
      apellidos: data.apellidos || '',
      documentoTipo: data.documentoTipo as any,
      documentoNumero: data.documentoNumero,
      email: data.email,
      telefono: data.telefono || '',
      fechaNacimiento: data.fechaNacimiento || '',
      direccion: data.direccion || '',
    },
    resumenProfesional: data.resumenProfesional || '',
    formacionAcademica: data.formacionAcademica || [],
    idiomas: data.idiomas || [],
    experiencia: data.experiencia || [],
    cv: data.cv,
    consentimientos: {
      tratamientoDatos: true, // Ya aceptó para tener cuenta
      comunicacionesComerciales: false,
      fechaAceptacion: new Date().toISOString()
    }
  };
}

export async function updateFoto(archivo: File): Promise<string> {
  // TODO: Subir foto a storage real
  const url = URL.createObjectURL(archivo);
  return url;
}

// Convierte la respuesta plana del backend (MePostulanteRespuesta)
// al formato anidado que espera el frontend (PerfilPostulante).
// Se reutiliza en todas las funciones de actualización.
function mapRespuesta(data: Record<string, any>): PerfilPostulante {
  return {
    id: data.postulanteId,
    datosPersonales: {
      nombres: data.nombres || '',
      apellidos: data.apellidos || '',
      documentoTipo: data.documentoTipo as any,
      documentoNumero: data.documentoNumero,
      email: data.email,
      telefono: data.telefono || '',
      fechaNacimiento: data.fechaNacimiento || '',
      direccion: data.direccion || '',
    },
    resumenProfesional: data.resumenProfesional || '',
    formacionAcademica: data.formacionAcademica || [],
    idiomas: data.idiomas || [],
    experiencia: data.experiencia || [],
    cv: data.cv,
    consentimientos: {
      tratamientoDatos: true,
      comunicacionesComerciales: false,
      fechaAceptacion: new Date().toISOString(),
    },
  };
}

// Envía un PATCH al endpoint y devuelve el perfil mapeado.
// Lanza un error descriptivo con el mensaje que viene del servidor si lo hay.
async function patchPerfil(cambios: Record<string, unknown>): Promise<PerfilPostulante> {
  const res = await fetch('/api/auth/perfil', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cambios),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || 'Error al guardar los cambios');
  }
  return mapRespuesta(await res.json());
}

export async function updateDatosPersonales(
  datos: DatosPersonalesPerfil
): Promise<PerfilPostulante> {
  // Omitimos email: el backend no lo acepta en este endpoint (extra="forbid")
  const { email: _email, ...sinEmail } = datos;
  return patchPerfil(sinEmail);
}

export async function updateResumenProfesional(resumen: string): Promise<PerfilPostulante> {
  return patchPerfil({ resumenProfesional: resumen });
}

// TODO: Subir CV a storage real (necesita endpoint en el backend)
export async function subirCv(archivo: File): Promise<CurriculumAdjunto> {
  const nuevoCv: CurriculumAdjunto = {
    nombreArchivo: archivo.name,
    tamanioKb: Math.round(archivo.size / 1024),
    fechaCarga: new Date().toISOString(),
    url: URL.createObjectURL(archivo),
  };
  return nuevoCv;
}

export async function eliminarCv(): Promise<void> {
  // TODO: Eliminar CV del storage
}

export async function addFormacion(
  formacion: Omit<FormacionAcademica, 'id'>,
  todasLasFormaciones: FormacionAcademica[]
): Promise<FormacionAcademica> {
  const nueva: FormacionAcademica = { ...formacion, id: crypto.randomUUID() };
  const nuevaLista = [...todasLasFormaciones, nueva];
  await patchPerfil({ formacionAcademica: nuevaLista });
  return nueva;
}

export async function eliminarFormacion(formacionId: string, todasLasFormaciones: FormacionAcademica[]): Promise<void> {
  const nuevaLista = todasLasFormaciones.filter(f => f.id !== formacionId);
  await patchPerfil({ formacionAcademica: nuevaLista });
}

export async function addIdioma(
  idioma: Omit<IdiomaPerfil, 'id'>,
  todosLosIdiomas: IdiomaPerfil[]
): Promise<IdiomaPerfil> {
  const nuevo: IdiomaPerfil = { ...idioma, id: crypto.randomUUID() };
  const nuevaLista = [...todosLosIdiomas, nuevo];
  await patchPerfil({ idiomas: nuevaLista });
  return nuevo;
}

export async function eliminarIdioma(idiomaId: string, todosLosIdiomas: IdiomaPerfil[]): Promise<void> {
  const nuevaLista = todosLosIdiomas.filter(i => i.id !== idiomaId);
  await patchPerfil({ idiomas: nuevaLista });
}

export async function addExperiencia(
  experiencia: Omit<ExperienciaLaboral, 'id'>,
  todasLasExperiencias: ExperienciaLaboral[]
): Promise<ExperienciaLaboral> {
  const nueva: ExperienciaLaboral = { ...experiencia, id: crypto.randomUUID() };
  const nuevaLista = [...todasLasExperiencias, nueva];
  await patchPerfil({ experiencia: nuevaLista });
  return nueva;
}

export async function eliminarExperiencia(experienciaId: string, todasLasExperiencias: ExperienciaLaboral[]): Promise<void> {
  const nuevaLista = todasLasExperiencias.filter(e => e.id !== experienciaId);
  await patchPerfil({ experiencia: nuevaLista });
}

