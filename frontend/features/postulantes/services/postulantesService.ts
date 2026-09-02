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


// Se usará al conectar cada microservicio real (ver los bloques "MODO API" comentados
// abajo); hoy no se referencia en código activo porque todo corre en modo mock.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const API_URL = process.env.NEXT_PUBLIC_API_URL; // ej: http://localhost:8080/api
const LATENCIA_MOCK_MS = 400;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchPostulantes(): Promise<Postulante[]> {
  // ---- MODO MOCK (activo ahora) ----
  await delay(LATENCIA_MOCK_MS);
  return structuredClone(mockPostulantes);

  // ---- MODO API (descomentar al integrar backend Java) ----
  // const res = await fetch(`${API_URL}/postulantes`);
  // if (!res.ok) throw new Error("Error al obtener los postulantes");
  // return res.json();
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