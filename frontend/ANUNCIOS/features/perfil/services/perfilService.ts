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
import { mockPerfiles, ID_PERFIL_POR_DEFECTO } from '../data/mockPerfil';

const API_URL = process.env.NEXT_PUBLIC_API_URL; // ej: http://localhost:8080/api
const LATENCIA_MOCK_MS = 400;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Id del perfil "logueado" en esta sesión del navegador. `useAuth` lo cambia
// al iniciar sesión o registrarse (ver `establecerPerfilActivo`), así cada
// una de las 3 cuentas mock ve su propia información en /perfil.
let perfilActivoId: string = ID_PERFIL_POR_DEFECTO;

function obtenerActivo(): PerfilPostulante {
  const perfil = mockPerfiles[perfilActivoId];
  if (!perfil) throw new Error('No hay un perfil activo para esta sesión.');
  return perfil;
}

function guardarActivo(actualizado: PerfilPostulante): void {
  mockPerfiles[perfilActivoId] = actualizado;
}

export function establecerPerfilActivo(id: string): void {
  perfilActivoId = id;
}

export interface DatosRegistro {
  datosPersonales: DatosPersonalesPerfil;
  // La fecha de aceptación la fija el servidor (aquí, el propio mock), no el
  // formulario: evita que quede en manos del cliente declarar cuándo aceptó.
  consentimientos: Omit<ConsentimientosPerfil, 'fechaAceptacion'>;
}

// Simula la creación de cuenta: agrega un nuevo perfil a la "base de datos"
// mock con los datos y consentimientos recién declarados, y lo deja como
// perfil activo. El tratamiento de datos es obligatorio (validado antes de
// llegar aquí, en el formulario); las comunicaciones comerciales quedan tal
// como el titular las marcó, sin forzar "true".
export async function registrarCuenta(datos: DatosRegistro): Promise<PerfilPostulante> {
  await delay(LATENCIA_MOCK_MS);
  const nuevoId = crypto.randomUUID();
  const nuevoPerfil: PerfilPostulante = {
    id: nuevoId,
    datosPersonales: datos.datosPersonales,
    resumenProfesional: '',
    formacionAcademica: [],
    idiomas: [],
    experiencia: [],
    consentimientos: {
      ...datos.consentimientos,
      fechaAceptacion: new Date().toISOString(),
    },
  };
  mockPerfiles[nuevoId] = nuevoPerfil;
  perfilActivoId = nuevoId;
  return structuredClone(nuevoPerfil);

  // ---- MODO API (descomentar al integrar backend) ----
  // const res = await fetch(`${API_URL}/auth/registro`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(datos),
  // });
  // if (!res.ok) throw new Error('Error al crear la cuenta');
  // return res.json();
}

export async function fetchPerfil(): Promise<PerfilPostulante> {
  // ---- MODO MOCK (activo ahora) ----
  await delay(LATENCIA_MOCK_MS);
  return structuredClone(obtenerActivo());

  // ---- MODO API (descomentar al integrar backend) ----
  // const res = await fetch(`${API_URL}/perfil`);
  // if (!res.ok) throw new Error('Error al obtener el perfil');
  // return res.json();
}

export async function updateFoto(archivo: File): Promise<string> {
  await delay(LATENCIA_MOCK_MS);
  const actual = obtenerActivo();
  const url = URL.createObjectURL(archivo);
  if (actual.fotoUrl) URL.revokeObjectURL(actual.fotoUrl);
  guardarActivo({ ...actual, fotoUrl: url });
  return url;

  // ---- MODO API ----
  // const formData = new FormData();
  // formData.append('foto', archivo);
  // const res = await fetch(`${API_URL}/perfil/foto`, { method: 'POST', body: formData });
  // if (!res.ok) throw new Error('Error al subir la foto');
  // const data = await res.json();
  // return data.url;
}

export async function updateDatosPersonales(
  datos: DatosPersonalesPerfil
): Promise<PerfilPostulante> {
  await delay(LATENCIA_MOCK_MS);
  const actualizado = { ...obtenerActivo(), datosPersonales: datos };
  guardarActivo(actualizado);
  return structuredClone(actualizado);

  // ---- MODO API ----
  // const res = await fetch(`${API_URL}/perfil`, {
  //   method: 'PATCH',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(datos),
  // });
  // if (!res.ok) throw new Error('Error al actualizar datos personales');
  // return res.json();
}

export async function updateResumenProfesional(resumen: string): Promise<PerfilPostulante> {
  await delay(LATENCIA_MOCK_MS);
  const actualizado = { ...obtenerActivo(), resumenProfesional: resumen };
  guardarActivo(actualizado);
  return structuredClone(actualizado);

  // ---- MODO API ----
  // const res = await fetch(`${API_URL}/perfil/resumen`, {
  //   method: 'PATCH',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ resumen }),
  // });
  // if (!res.ok) throw new Error('Error al actualizar el resumen profesional');
  // return res.json();
}

export async function subirCv(archivo: File): Promise<CurriculumAdjunto> {
  await delay(LATENCIA_MOCK_MS);
  const actual = obtenerActivo();
  if (actual.cv?.url) URL.revokeObjectURL(actual.cv.url);
  const nuevoCv: CurriculumAdjunto = {
    nombreArchivo: archivo.name,
    tamanioKb: Math.round(archivo.size / 1024),
    fechaCarga: new Date().toISOString(),
    url: URL.createObjectURL(archivo),
  };
  guardarActivo({ ...actual, cv: nuevoCv });
  return nuevoCv;

  // ---- MODO API ----
  // const formData = new FormData();
  // formData.append('cv', archivo);
  // const res = await fetch(`${API_URL}/perfil/cv`, { method: 'POST', body: formData });
  // if (!res.ok) throw new Error('Error al subir el CV');
  // return res.json();
}

export async function eliminarCv(): Promise<void> {
  await delay(LATENCIA_MOCK_MS);
  const actual = obtenerActivo();
  if (actual.cv?.url) URL.revokeObjectURL(actual.cv.url);
  guardarActivo({ ...actual, cv: undefined });

  // ---- MODO API ----
  // await fetch(`${API_URL}/perfil/cv`, { method: 'DELETE' });
}

export async function addFormacion(
  formacion: Omit<FormacionAcademica, 'id'>
): Promise<FormacionAcademica> {
  await delay(LATENCIA_MOCK_MS);
  const nueva: FormacionAcademica = { ...formacion, id: crypto.randomUUID() };
  const actual = obtenerActivo();
  guardarActivo({ ...actual, formacionAcademica: [...actual.formacionAcademica, nueva] });
  return nueva;

  // ---- MODO API ----
  // const res = await fetch(`${API_URL}/perfil/formacion`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(formacion),
  // });
  // if (!res.ok) throw new Error('Error al registrar la formación académica');
  // return res.json();
}

export async function eliminarFormacion(formacionId: string): Promise<void> {
  await delay(LATENCIA_MOCK_MS);
  const actual = obtenerActivo();
  guardarActivo({
    ...actual,
    formacionAcademica: actual.formacionAcademica.filter((f) => f.id !== formacionId),
  });

  // ---- MODO API ----
  // await fetch(`${API_URL}/perfil/formacion/${formacionId}`, { method: 'DELETE' });
}

export async function addIdioma(idioma: Omit<IdiomaPerfil, 'id'>): Promise<IdiomaPerfil> {
  await delay(LATENCIA_MOCK_MS);
  const nuevo: IdiomaPerfil = { ...idioma, id: crypto.randomUUID() };
  const actual = obtenerActivo();
  guardarActivo({ ...actual, idiomas: [...actual.idiomas, nuevo] });
  return nuevo;

  // ---- MODO API ----
  // const res = await fetch(`${API_URL}/perfil/idiomas`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(idioma),
  // });
  // if (!res.ok) throw new Error('Error al registrar el idioma');
  // return res.json();
}

export async function eliminarIdioma(idiomaId: string): Promise<void> {
  await delay(LATENCIA_MOCK_MS);
  const actual = obtenerActivo();
  guardarActivo({ ...actual, idiomas: actual.idiomas.filter((i) => i.id !== idiomaId) });

  // ---- MODO API ----
  // await fetch(`${API_URL}/perfil/idiomas/${idiomaId}`, { method: 'DELETE' });
}

export async function addExperiencia(
  experiencia: Omit<ExperienciaLaboral, 'id'>
): Promise<ExperienciaLaboral> {
  await delay(LATENCIA_MOCK_MS);
  const nueva: ExperienciaLaboral = { ...experiencia, id: crypto.randomUUID() };
  const actual = obtenerActivo();
  guardarActivo({ ...actual, experiencia: [...actual.experiencia, nueva] });
  return nueva;

  // ---- MODO API ----
  // const res = await fetch(`${API_URL}/perfil/experiencia`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(experiencia),
  // });
  // if (!res.ok) throw new Error('Error al registrar la experiencia');
  // return res.json();
}

export async function eliminarExperiencia(experienciaId: string): Promise<void> {
  await delay(LATENCIA_MOCK_MS);
  const actual = obtenerActivo();
  guardarActivo({
    ...actual,
    experiencia: actual.experiencia.filter((e) => e.id !== experienciaId),
  });

  // ---- MODO API ----
  // await fetch(`${API_URL}/perfil/experiencia/${experienciaId}`, { method: 'DELETE' });
}
