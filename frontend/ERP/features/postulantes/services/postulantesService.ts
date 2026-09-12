// features/postulantes/services/postulantesService.ts
//
// Capa de servicio. Este es el ÚNICO lugar que debe cambiar cuando se
// conecte el backend Java. Hoy lee de `mockPostulantes.ts` simulando
// latencia de red; mañana hace fetch() al endpoint real.
//
// Para integrar: comentar/eliminar el bloque "MODO MOCK" y descomentar
// el bloque "MODO API" de cada función. Los hooks y componentes que
// consumen este servicio NO se tocan.

import {
  Postulante,
  DocumentoPostulante,
  Evaluacion,
  EstadoProceso,
  HistorialEstado,
  DatosPersonales,
} from "../types/postulante.types";
import { mockPostulantes, getMockPostulanteById } from "../data/mockPostulantes";
import { PostulanteFormData } from "../types/postulante.types";

// NEXT_PUBLIC_API_URL ya no se usa para construir URLs (el navegador solo
// llama a las rutas propias del servidor, ej. /api/postulantes -que son
// las que de verdad hablan con el Gateway, con el JWT que sacan de la
// cookie httpOnly-); acá solo funciona como interruptor mock/API.
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const LATENCIA_MOCK_MS = 400;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Traduce el DTO plano que hoy devuelve servicio-postulantes al shape
// anidado que espera el resto del Front-End (`Postulante`). Los campos
// que todavía no existen en el backend real (evaluaciones, historial de
// estados, pipeline por anuncio) llegan vacíos hasta que se conecte
// servicio-procesos-seleccion.
function mapearPostulanteDeApi(dto: Record<string, unknown>): Postulante {
  return {
    id: dto.id as string,
    datosPersonales: {
      nombres: dto.nombres as string,
      apellidos: dto.apellidos as string,
      documentoTipo: dto.documentoTipo as DatosPersonales["documentoTipo"],
      documentoNumero: dto.documentoNumero as string,
      email: dto.email as string,
      telefono: (dto.telefono as string) ?? "",
      fechaNacimiento: "",
      cargoPostulado: (dto.cargoPostulado as string) ?? "",
      empresaCliente: (dto.empresaCliente as string) ?? "",
    },
    estadoActual: "POSTULADO",
    documentos: [],
    evaluaciones: [],
    historialEstados: [],
    fechaRegistro: dto.fechaRegistro as string,
    formacionAcademica: (dto.formacionAcademica as Postulante["formacionAcademica"]) ?? [],
    idiomas: (dto.idiomas as Postulante["idiomas"]) ?? [],
    experiencia: (dto.experiencia as Postulante["experiencia"]) ?? [],
    procesosPostulacion: {},
    consentimientos: {
      tratamientoDatos: Boolean(dto.consentimientoTratamientoDatos),
      comunicacionesComerciales: Boolean(dto.consentimientoComunicacionesComerciales),
      fechaAceptacion: "",
    },
  };
}

export async function fetchPostulantes(): Promise<Postulante[]> {
  if (API_URL) {
    // ---- MODO API (navegador -> /api/postulantes (Next.js) -> Gateway -> servicio-postulantes) ----
    const res = await fetch("/api/postulantes");
    if (res.status === 401) throw new Error("No hay una sesión activa. Vuelve a iniciar sesión.");
    if (!res.ok) throw new Error("Error al obtener los postulantes");
    const dtos: Record<string, unknown>[] = await res.json();
    return dtos.map(mapearPostulanteDeApi);
  }

  // ---- MODO MOCK (activo por defecto, ej. `npm run dev` sin Docker) ----
  await delay(LATENCIA_MOCK_MS);
  return structuredClone(mockPostulantes);
}

export async function fetchPostulanteById(id: string): Promise<Postulante> {
  // ---- MODO MOCK (activo ahora) ----
  await delay(LATENCIA_MOCK_MS);
  const postulante = getMockPostulanteById(id);
  if (!postulante) throw new Error("Postulante no encontrado");
  return structuredClone(postulante);

  // ---- MODO API (descomentar al integrar backend Java) ----
  // const res = await fetch(`${API_URL}/postulantes/${id}`);
  // if (!res.ok) throw new Error("Error al obtener el postulante");
  // return res.json();
}

export async function updateDatosPersonales(
  id: string,
  datos: DatosPersonales
): Promise<Postulante> {
  await delay(LATENCIA_MOCK_MS);
  const postulante = mockPostulantes.find((p) => p.id === id);
  if (!postulante) throw new Error("Postulante no encontrado");
  postulante.datosPersonales = datos;
  return structuredClone(postulante);

  // ---- MODO API ----
  // const res = await fetch(`${API_URL}/postulantes/${id}`, {
  //   method: "PATCH",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(datos),
  // });
  // if (!res.ok) throw new Error("Error al actualizar datos personales");
  // return res.json();
}

export async function addDocumento(
  id: string,
  archivo: File,
  tipo: DocumentoPostulante["tipo"]
): Promise<DocumentoPostulante> {
  await delay(LATENCIA_MOCK_MS);
  const postulante = mockPostulantes.find((p) => p.id === id);
  if (!postulante) throw new Error("Postulante no encontrado");
  const nuevoDocumento: DocumentoPostulante = {
    id: crypto.randomUUID(),
    nombreArchivo: archivo.name,
    tipo,
    tamanioKb: Math.round(archivo.size / 1024),
    fechaCarga: new Date().toISOString(),
    // URL local solo para poder previsualizar/descargar en esta misma sesión
    // del navegador; no persiste ni se sube a ningún lado. El backend Java
    // reemplazará esto por la URL real del archivo almacenado.
    url: URL.createObjectURL(archivo),
  };
  postulante.documentos.push(nuevoDocumento);
  return nuevoDocumento;

  // ---- MODO API ----
  // const formData = new FormData();
  // formData.append("archivo", archivo);
  // formData.append("tipo", tipo);
  // const res = await fetch(`${API_URL}/postulantes/${id}/documentos`, {
  //   method: "POST",
  //   body: formData,
  // });
  // if (!res.ok) throw new Error("Error al subir el documento");
  // return res.json();
}

export async function replaceDocumento(
  id: string,
  documentoId: string,
  archivo: File
): Promise<DocumentoPostulante> {
  await delay(LATENCIA_MOCK_MS);
  const postulante = mockPostulantes.find((p) => p.id === id);
  if (!postulante) throw new Error("Postulante no encontrado");
  const documento = postulante.documentos.find((d) => d.id === documentoId);
  if (!documento) throw new Error("Documento no encontrado");

  if (documento.url) URL.revokeObjectURL(documento.url);
  documento.nombreArchivo = archivo.name;
  documento.tamanioKb = Math.round(archivo.size / 1024);
  documento.fechaCarga = new Date().toISOString();
  documento.url = URL.createObjectURL(archivo);
  return documento;

  // ---- MODO API ----
  // const formData = new FormData();
  // formData.append("archivo", archivo);
  // const res = await fetch(`${API_URL}/postulantes/${id}/documentos/${documentoId}`, {
  //   method: "PUT",
  //   body: formData,
  // });
  // if (!res.ok) throw new Error("Error al reemplazar el documento");
  // return res.json();
}

export async function deleteDocumento(id: string, documentoId: string): Promise<void> {
  await delay(LATENCIA_MOCK_MS);
  const postulante = mockPostulantes.find((p) => p.id === id);
  if (!postulante) throw new Error("Postulante no encontrado");
  const documento = postulante.documentos.find((d) => d.id === documentoId);
  if (documento?.url) URL.revokeObjectURL(documento.url);
  postulante.documentos = postulante.documentos.filter((d) => d.id !== documentoId);

  // ---- MODO API ----
  // await fetch(`${API_URL}/postulantes/${id}/documentos/${documentoId}`, { method: "DELETE" });
}

export async function addEvaluacion(
  id: string,
  evaluacion: Omit<Evaluacion, "id">
): Promise<Evaluacion> {
  await delay(LATENCIA_MOCK_MS);
  const postulante = mockPostulantes.find((p) => p.id === id);
  if (!postulante) throw new Error("Postulante no encontrado");
  const nueva: Evaluacion = { ...evaluacion, id: crypto.randomUUID() };
  postulante.evaluaciones.push(nueva);
  return nueva;

  // ---- MODO API ----
  // const res = await fetch(`${API_URL}/postulantes/${id}/evaluaciones`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(evaluacion),
  // });
  // if (!res.ok) throw new Error("Error al registrar la evaluación");
  // return res.json();
}

export async function updateEstado(
  id: string,
  estado: EstadoProceso,
  usuarioResponsable: string,
  comentario?: string
): Promise<HistorialEstado> {
  await delay(LATENCIA_MOCK_MS);
  const postulante = mockPostulantes.find((p) => p.id === id);
  if (!postulante) throw new Error("Postulante no encontrado");
  const nuevoRegistro: HistorialEstado = {
    id: crypto.randomUUID(),
    estado,
    fecha: new Date().toISOString(),
    usuarioResponsable,
    comentario,
  };
  postulante.estadoActual = estado;
  postulante.historialEstados.push(nuevoRegistro);
  return nuevoRegistro;

  // ---- MODO API ----
  // const res = await fetch(`${API_URL}/postulantes/${id}/estado`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ estado, comentario }),
  // });
  // if (!res.ok) throw new Error("Error al actualizar el estado");
  // return res.json();
}

// Cambia el estado del pipeline de UNA postulación puntual (un anuncio),
// sin tocar el proceso "principal" (`estadoActual`/`historialEstados`) —
// el mismo postulante puede estar en "Entrevista" para un anuncio y ya
// "Contratado" en otro al mismo tiempo. Para revertir una decisión final
// (Contratado/Descartado), se llama de nuevo con estado "POSTULADO".
export async function actualizarEstadoPostulacion(
  id: string,
  anuncioId: string,
  estado: EstadoProceso,
  usuarioResponsable: string,
  comentario?: string
): Promise<HistorialEstado> {
  await delay(LATENCIA_MOCK_MS);
  const postulante = mockPostulantes.find((p) => p.id === id);
  if (!postulante) throw new Error("Postulante no encontrado");
  const nuevoRegistro: HistorialEstado = {
    id: crypto.randomUUID(),
    estado,
    fecha: new Date().toISOString(),
    usuarioResponsable,
    comentario,
  };
  const historialPrevio = postulante.procesosPostulacion[anuncioId]?.historialEstados ?? [];
  postulante.procesosPostulacion = {
    ...postulante.procesosPostulacion,
    [anuncioId]: {
      estadoActual: estado,
      historialEstados: [...historialPrevio, nuevoRegistro],
    },
  };
  return nuevoRegistro;

  // ---- MODO API ----
  // const res = await fetch(`${API_URL}/postulantes/${id}/postulaciones/${anuncioId}/estado`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ estado, comentario }),
  // });
  // if (!res.ok) throw new Error("Error al actualizar el estado de la postulación");
  // return res.json();
}

// ============================================================
// CREAR NUEVO POSTULANTE
// ============================================================

export async function crearPostulante(
  data: PostulanteFormData
): Promise<Postulante> {
  // ---- MODO MOCK (activo ahora) ----
  await delay(LATENCIA_MOCK_MS);
  
  const nuevoPostulante: Postulante = {
    id: String(mockPostulantes.length + 1),
    fechaRegistro: new Date().toISOString(),
    estadoActual: "POSTULADO",
    datosPersonales: {
      nombres: data.nombres,
      apellidos: data.apellidos,
      documentoTipo: data.documentoTipo,
      documentoNumero: data.documentoNumero,
      email: data.email,
      telefono: data.telefono,
      fechaNacimiento: data.fechaNacimiento,
      direccion: data.direccion || "",
      cargoPostulado: data.cargoPostulado,
      empresaCliente: data.empresaCliente,
      fuenteReclutamiento: data.fuenteReclutamiento || "",
    },
    documentos: [],
    evaluaciones: [],
    historialEstados: [
      {
        id: crypto.randomUUID(),
        estado: "POSTULADO",
        fecha: new Date().toISOString(),
        usuarioResponsable: "Sistema",
        comentario: "Postulante registrado desde el sistema",
      },
    ],
    formacionAcademica: [],
    idiomas: [],
    experiencia: [],
    procesosPostulacion: {},
    // Registrado manualmente por RRHH: aún no tiene cuenta propia en la
    // bolsa de trabajo, así que no ha aceptado el tratamiento de datos.
    consentimientos: {
      tratamientoDatos: false,
      comunicacionesComerciales: false,
      fechaAceptacion: "",
    },
  };

  mockPostulantes.push(nuevoPostulante);
  return structuredClone(nuevoPostulante);

  // ---- MODO API (descomentar al integrar backend Java) ----
  // const res = await fetch(`${API_URL}/postulantes`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(data),
  // });
  // if (!res.ok) throw new Error("Error al crear el postulante");
  // return res.json();
}