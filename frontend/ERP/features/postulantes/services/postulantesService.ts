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
import { PostulanteFormData, NuevaEvaluacion } from "../types/postulante.types";
import { calcularPuntajeTotal, calcularResultado } from "../utils/evaluacion";
import { anunciosMock } from "@/features/anuncios/data/mock-anuncios";
import { fetchAnuncios } from "@/features/anuncios/services/anunciosApi";
import { mensajeDeError, sesionVencida } from "@/lib/apiCliente";

// Los anuncios se leen desde features/anuncios/services/anunciosApi.ts; se reexporta aquí para
// que los hooks de postulantes sigan importándolo desde este servicio.
export { fetchAnuncios };

// NEXT_PUBLIC_API_URL ya no se usa para construir URLs (el navegador solo
// llama a las rutas propias del servidor, ej. /api/postulantes -que son
// las que de verdad hablan con el Gateway, con el JWT que sacan de la
// cookie httpOnly-); acá solo funciona como interruptor mock/API.
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const LATENCIA_MOCK_MS = 400;
// Nombre que firma las evaluaciones en modo mock (con backend lo pone el servidor).
const USUARIO_MOCK = "Usuario RRHH";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Formación, idiomas y experiencia -------------------------------------
// servicio-postulantes las guarda como listas JSON con campos más simples que
// los del frontend (ej. el idioma se llama "idioma" en vez de "nombre", la
// formación trae "anioFin" en vez de fechas, los niveles vienen con tildes o
// en minúscula). Estas funciones los convierten al shape que dibuja
// PerfilProfesionalResumen, con valores por defecto cuando falta algo.
const NIVELES_FORMACION = ["SECUNDARIA", "TECNICO", "UNIVERSITARIO", "POSTGRADO", "OTRO"];
const NIVELES_IDIOMA = ["BASICO", "INTERMEDIO", "AVANZADO", "NATIVO"];

// "Intermedio" -> "INTERMEDIO", "Técnico" -> "TECNICO"
const normalizarNivel = (valor: unknown) =>
  String(valor ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

function mapearFormacion(lista: unknown): Postulante["formacionAcademica"] {
  if (!Array.isArray(lista)) return [];
  return lista.map((item: Record<string, unknown>, i) => {
    const nivel = normalizarNivel(item.nivel);
    const fin = item.fechaFin ?? item.anioFin;
    return {
      id: String(item.id ?? `formacion-${i}`),
      institucion: String(item.institucion ?? ""),
      titulo: String(item.titulo ?? ""),
      nivel: (NIVELES_FORMACION.includes(nivel) ? nivel : "OTRO") as Postulante["formacionAcademica"][number]["nivel"],
      fechaInicio: String(item.fechaInicio ?? "—"),
      fechaFin: fin != null ? String(fin) : undefined,
      enCurso: Boolean(item.enCurso),
    };
  });
}

function mapearIdiomas(lista: unknown): Postulante["idiomas"] {
  if (!Array.isArray(lista)) return [];
  return lista.map((item: Record<string, unknown>, i) => {
    const nivel = normalizarNivel(item.nivel);
    return {
      id: String(item.id ?? `idioma-${i}`),
      nombre: String(item.nombre ?? item.idioma ?? ""),
      nivel: (NIVELES_IDIOMA.includes(nivel) ? nivel : "BASICO") as Postulante["idiomas"][number]["nivel"],
    };
  });
}

function mapearExperiencia(lista: unknown): Postulante["experiencia"] {
  if (!Array.isArray(lista)) return [];
  return lista.map((item: Record<string, unknown>, i) => ({
    id: String(item.id ?? `experiencia-${i}`),
    empresa: String(item.empresa ?? ""),
    cargo: String(item.cargo ?? ""),
    fechaInicio: String(item.fechaInicio ?? "—"),
    fechaFin: item.fechaFin != null ? String(item.fechaFin) : undefined,
    // Si no tiene fecha de fin, se asume que sigue trabajando ahí.
    actualidad: item.actualidad != null ? Boolean(item.actualidad) : item.fechaFin == null,
    descripcion: item.descripcion != null ? String(item.descripcion) : undefined,
  }));
}

// Traduce el DTO plano que hoy devuelve servicio-postulantes al shape
// anidado que espera el resto del Front-End (`Postulante`). Los campos
// que todavía no existen en el backend real (evaluaciones, historial de
// estados, pipeline por anuncio) llegan vacíos hasta que se conecte
// servicio-procesos-seleccion.
export function mapearPostulanteDeApi(dto: Record<string, unknown>): Postulante {
  return {
    id: dto.id as string,
    datosPersonales: {
      nombres: dto.nombres as string,
      apellidos: dto.apellidos as string,
      documentoTipo: dto.documentoTipo as DatosPersonales["documentoTipo"],
      documentoNumero: dto.documentoNumero as string,
      email: dto.email as string,
      telefono: (dto.telefono as string) ?? "",
      fechaNacimiento: (dto.fechaNacimiento as string | null) ?? "",
      direccion: (dto.direccion as string | null) ?? "",
      cargoPostulado: (dto.cargoPostulado as string) ?? "",
      empresaCliente: (dto.empresaCliente as string) ?? "",
      fuenteReclutamiento: (dto.fuenteReclutamiento as string | null) ?? "",
    },
    // "NUEVO" mientras no tenga ninguna postulación (al cargarlas se reemplaza por la última etapa).
    estadoActual: "NUEVO",
    documentos: [],
    evaluaciones: [],
    historialEstados: [],
    fechaRegistro: dto.fechaRegistro as string,
    formacionAcademica: mapearFormacion(dto.formacionAcademica),
    idiomas: mapearIdiomas(dto.idiomas),
    experiencia: mapearExperiencia(dto.experiencia),
    procesosPostulacion: {},
    consentimientos: {
      tratamientoDatos: Boolean(dto.consentimientoTratamientoDatos),
      comunicacionesComerciales: Boolean(dto.consentimientoComunicacionesComerciales),
      fechaAceptacion: "",
    },
    tieneCuenta: Boolean(dto.tieneCuenta),
  };
}

// ¿El postulante ya tiene cuenta en ANUNCIOS? Con backend lo informa la API; en modo
// mock (sin backend) se considera que sí solo si aceptó el tratamiento de datos, que
// es lo que ocurre únicamente cuando se registró por su cuenta.
export function postulanteTieneCuenta(postulante: Postulante): boolean {
  return postulante.tieneCuenta ?? postulante.consentimientos.tratamientoDatos;
}

// A cuántos anuncios se ha postulado. Con backend son sus postulaciones reales
// (servicio-procesos-seleccion); en modo mock, los anuncios de ejemplo que lo tienen asociado.
export function contarPostulaciones(postulante: Postulante): number {
  if (API_URL) return Object.keys(postulante.procesosPostulacion).length;
  return anunciosMock.filter((a) => a.postulantesAsociadosIds.includes(postulante.id)).length;
}

export async function fetchPostulantes(): Promise<Postulante[]> {
  if (API_URL) {
    // ---- MODO API (navegador -> /api/... (Next.js) -> Gateway -> microservicios) ----
    // Se piden los postulantes (servicio-postulantes) y TODAS las postulaciones
    // (servicio-procesos-seleccion) a la vez, para saber en cuántos anuncios postuló cada uno
    // y en qué etapa está (lo usan la tabla y el pipeline).
    const [res, resProcesos] = await Promise.all([fetch("/api/postulantes"), fetch("/api/procesos")]);
    if (res.status === 401) throw new Error(sesionVencida());
    if (!res.ok) throw new Error("Error al obtener los postulantes");
    const dtos: Record<string, unknown>[] = await res.json();
    const postulantes = dtos.map(mapearPostulanteDeApi);

    // Las postulaciones son "de mejor esfuerzo": si fallan, la lista igual se muestra.
    if (resProcesos.ok) {
      const procesos: Record<string, unknown>[] = await resProcesos.json();
      for (const postulante of postulantes) {
        const suyos = procesos.filter((p) => p.postulanteId === postulante.id);
        postulante.procesosPostulacion = mapearProcesosDeApi(suyos);
        if (suyos.length > 0) postulante.estadoActual = suyos[suyos.length - 1].estadoActual as EstadoProceso;
      }
    }
    return postulantes;
  }

  // ---- MODO MOCK (activo por defecto, ej. `npm run dev` sin Docker) ----
  await delay(LATENCIA_MOCK_MS);
  return structuredClone(mockPostulantes);
}

// Traduce un documento de servicio-postulantes al shape que usa DocumentosTab.
// `url` solo se rellena si el documento tiene un archivo real (`tieneArchivo`), así los
// botones "Ver/Descargar" se habilitan únicamente cuando de verdad hay algo que abrir.
// El tamaño llega en bytes (los documentos antiguos, sin archivo real, lo traen vacío → 0 KB).
function mapearDocumentoDeApi(dto: Record<string, unknown>, postulanteId: string): DocumentoPostulante {
  const tipo = String(dto.tipo ?? "").toUpperCase();
  return {
    id: dto.id as string,
    nombreArchivo: dto.nombreArchivo as string,
    tipo: (["CV", "DNI", "CERTIFICADO"].includes(tipo) ? tipo : "OTRO") as DocumentoPostulante["tipo"],
    tamanioKb: Math.round(Number(dto.tamanioBytes ?? 0) / 1024),
    fechaCarga: dto.fechaSubida as string,
    // El archivo NO se abre con el enlace público de Cloudinary (los PDF están bloqueados
    // ahí); se pide a nuestro servidor, que lo entrega con la sesión del usuario.
    url: dto.tieneArchivo
      ? `/api/postulantes/${encodeURIComponent(postulanteId)}/documentos/${encodeURIComponent(String(dto.id))}/archivo`
      : undefined,
  };
}

// Un cambio de etapa del historial de una postulación.
function mapearHistorialDeApi(dto: Record<string, unknown>): HistorialEstado {
  return {
    id: dto.id as string,
    estado: dto.estado as EstadoProceso,
    fecha: dto.fecha as string,
    usuarioResponsable: dto.usuarioResponsable as string,
    comentario: (dto.comentario as string | null) ?? undefined,
  };
}

// Las postulaciones llegan como una lista (una por anuncio); la pantalla las espera
// como un objeto cuya clave es el id del anuncio: { "1": { estadoActual, historialEstados } }.
function mapearProcesosDeApi(dtos: Record<string, unknown>[]): Postulante["procesosPostulacion"] {
  const procesos: Postulante["procesosPostulacion"] = {};
  for (const dto of dtos) {
    procesos[String(dto.anuncioId)] = {
      estadoActual: dto.estadoActual as EstadoProceso,
      historialEstados: (dto.historialEstados as Record<string, unknown>[]).map(mapearHistorialDeApi),
    };
  }
  return procesos;
}

// Una evaluación por competencias (el backend ya calcula puntajeTotal y resultado).
function mapearEvaluacionDeApi(dto: Record<string, unknown>): Evaluacion {
  return {
    id: dto.id as string,
    evaluador: dto.evaluador as string,
    fecha: dto.fecha as string,
    competencias: dto.competencias as Evaluacion["competencias"],
    puntajeTotal: dto.puntajeTotal as number,
    resultado: dto.resultado as Evaluacion["resultado"],
    comentarios: (dto.comentarios as string) ?? "",
  };
}

export async function fetchPostulanteById(id: string): Promise<Postulante> {
  if (API_URL) {
    // ---- MODO API (navegador -> rutas /api/... (Next.js) -> Gateway -> microservicios) ----
    // Se piden en paralelo: los datos del postulante (servicio-postulantes), sus
    // documentos (servicio-postulantes), sus postulaciones y sus evaluaciones
    // (servicio-procesos-seleccion).
    const idUrl = encodeURIComponent(id);
    const [resPostulante, resDocumentos, resProcesos, resEvaluaciones] = await Promise.all([
      fetch(`/api/postulantes/${idUrl}`),
      fetch(`/api/postulantes/${idUrl}/documentos`),
      fetch(`/api/procesos?postulanteId=${idUrl}`),
      fetch(`/api/evaluaciones?postulanteId=${idUrl}`),
    ]);
    if (resPostulante.status === 401) throw new Error(sesionVencida());
    if (resPostulante.status === 404) throw new Error("Postulante no encontrado");
    if (!resPostulante.ok) throw new Error("Error al obtener el postulante");

    const postulante = mapearPostulanteDeApi(await resPostulante.json());
    // Lo secundario (documentos, postulaciones, evaluaciones) es "de mejor esfuerzo":
    // si una de esas llamadas falla, la ficha igual se muestra, solo que sin esa sección.
    if (resDocumentos.ok) {
      const dtos: Record<string, unknown>[] = await resDocumentos.json();
      postulante.documentos = dtos.map((d) => mapearDocumentoDeApi(d, id));
    }
    if (resProcesos.ok) {
      const dtos: Record<string, unknown>[] = await resProcesos.json();
      postulante.procesosPostulacion = mapearProcesosDeApi(dtos);
      // El distintivo del encabezado muestra la etapa de su postulación más reciente.
      if (dtos.length > 0) postulante.estadoActual = dtos[dtos.length - 1].estadoActual as EstadoProceso;
    }
    if (resEvaluaciones.ok) {
      const dtos: Record<string, unknown>[] = await resEvaluaciones.json();
      postulante.evaluaciones = dtos.map(mapearEvaluacionDeApi);
    }
    return postulante;
  }

  // ---- MODO MOCK (activo por defecto, ej. `npm run dev` sin Docker) ----
  await delay(LATENCIA_MOCK_MS);
  const postulante = getMockPostulanteById(id);
  if (!postulante) throw new Error("Postulante no encontrado");
  return structuredClone(postulante);
}

export async function updateDatosPersonales(
  id: string,
  datos: DatosPersonales
): Promise<Postulante> {
  if (API_URL) {
    // ---- MODO API ----
    // El documento y el correo no se pueden cambiar. Tras guardar se vuelve a leer el
    // postulante: la pantalla muestra lo que REALMENTE quedó en la base de datos.
    const res = await fetch(`/api/postulantes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombres: datos.nombres,
        apellidos: datos.apellidos,
        telefono: datos.telefono,
        cargoPostulado: datos.cargoPostulado,
        empresaCliente: datos.empresaCliente,
        fechaNacimiento: datos.fechaNacimiento || null,
        direccion: datos.direccion || null,
        fuenteReclutamiento: datos.fuenteReclutamiento || null,
      }),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, "Error al actualizar datos personales"));
    return fetchPostulanteById(id);
  }

  // ---- MODO MOCK ----
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
  if (API_URL) {
    // ---- MODO API: el archivo viaja al backend, que lo sube a Cloudinary ----
    const formulario = new FormData();
    formulario.append("tipo", tipo);
    formulario.append("archivo", archivo);
    const res = await fetch(`/api/postulantes/${encodeURIComponent(id)}/documentos`, {
      method: "POST",
      body: formulario, // sin "Content-Type": el navegador lo agrega solo, con su "boundary"
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, "Error al subir el documento"));
    return mapearDocumentoDeApi(await res.json(), id);
  }

  // ---- MODO MOCK ----
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
  if (API_URL) {
    // ---- MODO API: se sube el archivo nuevo a Cloudinary y se borra el anterior ----
    const formulario = new FormData();
    formulario.append("archivo", archivo);
    const res = await fetch(
      `/api/postulantes/${encodeURIComponent(id)}/documentos/${encodeURIComponent(documentoId)}/archivo`,
      { method: "PUT", body: formulario }
    );
    if (!res.ok) throw new Error(await mensajeDeError(res, "Error al reemplazar el documento"));
    return mapearDocumentoDeApi(await res.json(), id);
  }

  // ---- MODO MOCK ----
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
  if (API_URL) {
    // ---- MODO API: se elimina el documento y su archivo de Cloudinary ----
    const res = await fetch(
      `/api/postulantes/${encodeURIComponent(id)}/documentos/${encodeURIComponent(documentoId)}`,
      { method: "DELETE" }
    );
    if (!res.ok) throw new Error(await mensajeDeError(res, "Error al eliminar el documento"));
    return;
  }

  // ---- MODO MOCK ----
  await delay(LATENCIA_MOCK_MS);
  const postulante = mockPostulantes.find((p) => p.id === id);
  if (!postulante) throw new Error("Postulante no encontrado");
  const documento = postulante.documentos.find((d) => d.id === documentoId);
  if (documento?.url) URL.revokeObjectURL(documento.url);
  postulante.documentos = postulante.documentos.filter((d) => d.id !== documentoId);

  // ---- MODO API ----
  // await fetch(`${API_URL}/postulantes/${id}/documentos/${documentoId}`, { method: "DELETE" });
}

export async function addEvaluacion(id: string, evaluacion: NuevaEvaluacion): Promise<Evaluacion> {
  if (API_URL) {
    // ---- MODO API ----
    // Solo se envían las competencias y los comentarios: el puntaje, el resultado
    // (APTO / NO APTO), la fecha y el evaluador (la cuenta con sesión iniciada) los
    // decide el backend, no el navegador.
    const res = await fetch("/api/evaluaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postulanteId: id,
        competencias: evaluacion.competencias,
        comentarios: evaluacion.comentarios,
      }),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, "Error al registrar la evaluación"));
    return mapearEvaluacionDeApi(await res.json());
  }

  // ---- MODO MOCK ----
  await delay(LATENCIA_MOCK_MS);
  const postulante = mockPostulantes.find((p) => p.id === id);
  if (!postulante) throw new Error("Postulante no encontrado");
  // Igual que hace el backend: el sistema completa evaluador, fecha, puntaje y resultado.
  const nueva: Evaluacion = {
    id: crypto.randomUUID(),
    evaluador: USUARIO_MOCK,
    fecha: new Date().toISOString().slice(0, 10),
    competencias: evaluacion.competencias,
    puntajeTotal: calcularPuntajeTotal(evaluacion.competencias),
    resultado: calcularResultado(evaluacion.competencias),
    comentarios: evaluacion.comentarios,
  };
  postulante.evaluaciones.push(nueva);
  return nueva;
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
  if (API_URL) {
    // ---- MODO API ----
    // El nombre del responsable NO se envía: el backend usa el de quien tiene la
    // sesión iniciada (así nadie puede firmar un cambio a nombre de otra persona).
    const res = await fetch(
      `/api/procesos/postulante/${encodeURIComponent(id)}/anuncio/${encodeURIComponent(anuncioId)}/estado`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado, comentario }),
      }
    );
    if (!res.ok) throw new Error(await mensajeDeError(res, "Error al actualizar el estado de la postulación"));
    return mapearHistorialDeApi(await res.json());
  }

  // ---- MODO MOCK ----
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
  if (API_URL) {
    // ---- MODO API (navegador -> /api/postulantes (Next.js) -> Gateway -> servicio-postulantes) ----
    // Lo registra RRHH a mano: aún no tiene cuenta propia, así que no ha aceptado el
    // tratamiento de datos (queda en false hasta que se registre en ANUNCIOS).
    const res = await fetch("/api/postulantes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombres: data.nombres.trim(),
        apellidos: data.apellidos.trim(),
        documentoTipo: data.documentoTipo,
        documentoNumero: data.documentoNumero.trim(),
        email: data.email.trim(),
        telefono: data.telefono.trim(),
        fechaNacimiento: data.fechaNacimiento || null,
        direccion: data.direccion?.trim() || null,
        fuenteReclutamiento: data.fuenteReclutamiento || null,
        cargoPostulado: data.cargoPostulado,
        empresaCliente: data.empresaCliente,
        consentimientos: { tratamientoDatos: false, comunicacionesComerciales: false },
      }),
    });
    if (!res.ok) throw new Error(await mensajeDeError(res, "Error al guardar el postulante"));
    const postulante = mapearPostulanteDeApi(await res.json());

    // El cargo y la empresa elegidos corresponden a un anuncio real: se registra su
    // postulación a ese anuncio (así aparece en su ficha y en el pipeline).
    const anuncio = (await fetchAnuncios()).find(
      (a) => a.cargo === data.cargoPostulado && a.empresaRazonSocial === data.empresaCliente
    );
    if (anuncio) {
      const resProceso = await fetch("/api/procesos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postulanteId: postulante.id, anuncioId: anuncio.id }),
      });
      if (resProceso.ok) {
        const proceso = await resProceso.json();
        postulante.procesosPostulacion = mapearProcesosDeApi([proceso]);
        postulante.estadoActual = proceso.estadoActual as EstadoProceso;
      } else {
        // El postulante ya quedó guardado; solo falló su postulación. No se corta el flujo.
        console.error("No se pudo registrar la postulación al anuncio", await resProceso.text());
      }
    }
    return postulante;
  }

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