// features/postulantes/services/postulantesService.ts
//
// Capa de servicio de postulantes. El navegador solo llama a las rutas propias del
// servidor de Next.js (/api/...), que son las que hablan con el Gateway con el JWT
// de la cookie httpOnly.

import {
  Postulante,
  DocumentoPostulante,
  Evaluacion,
  EstadoProceso,
  HistorialEstado,
  DatosPersonales,
} from "../types/postulante.types";
import { PostulanteFormData, NuevaEvaluacion } from "../types/postulante.types";
import { fetchAnuncios } from "@/features/anuncios/services/anunciosApi";
import { mensajeDeError, sesionVencida } from "@/lib/apiCliente";
import { cargarConCache, guardarCache, marcarVencido } from "@/lib/cacheCliente";

// Los anuncios se leen desde features/anuncios/services/anunciosApi.ts; se reexporta aquí para
// que los hooks de postulantes sigan importándolo desde este servicio.
export { fetchAnuncios };

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

// ¿El postulante ya tiene cuenta en ANUNCIOS? Lo informa la API.
export function postulanteTieneCuenta(postulante: Postulante): boolean {
  return postulante.tieneCuenta;
}

// "Solicitar cuenta": el backend le envía al postulante (con Amazon SES) un correo para que cree su
// cuenta en ANUNCIOS. Devuelve el correo al que se envió.
export async function solicitarCuenta(postulanteId: string): Promise<string> {
  const res = await fetch(`/api/postulantes/${encodeURIComponent(postulanteId)}/solicitar-cuenta`, { method: "POST" });
  if (res.status === 401) throw new Error(sesionVencida());
  if (!res.ok) throw new Error(await mensajeDeError(res, "No se pudo enviar la invitación"));
  const { enviadoA } = (await res.json()) as { enviadoA: string };
  return enviadoA;
}

// A cuántos anuncios se ha postulado (sus postulaciones en servicio-procesos-seleccion).
export function contarPostulaciones(postulante: Postulante): number {
  return Object.keys(postulante.procesosPostulacion).length;
}

export async function fetchPostulantes(): Promise<Postulante[]> {
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
    // El archivo no tiene enlace público (el bucket de S3 es privado): se pide a nuestro
    // servidor, que lo entrega con la sesión del usuario.
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

// La ficha se recuerda 10 s: así, si se "adelantó" al pasar el mouse por la fila (ver `prefetchPostulante`),
// se abre al instante. Cualquier cambio guardado (datos, documentos, evaluaciones, etapas) la marca como vencida.
export function fetchPostulanteById(id: string): Promise<Postulante> {
  return cargarConCache(`postulante:${id}`, () => pedirPostulante(id), 10_000);
}

// Pide la ficha en segundo plano (sin mostrar nada) para que abra más rápido cuando la persona haga clic.
export function prefetchPostulante(id: string): void {
  fetchPostulanteById(id).catch(() => undefined);
}

async function pedirPostulante(id: string): Promise<Postulante> {
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

export async function updateDatosPersonales(
  id: string,
  datos: DatosPersonales
): Promise<Postulante> {
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
  marcarVencido("postulantes:");
  // Se pide la ficha con una petición NUEVA (no fetchPostulanteById): si había una lectura en curso
  // que empezó ANTES de guardar (ej. el "adelanto" al pasar el mouse), reutilizarla traería los datos viejos.
  const actualizado = await pedirPostulante(id);
  guardarCache(`postulante:${id}`, actualizado);
  return actualizado;
}

export async function addDocumento(
  id: string,
  archivo: File,
  tipo: DocumentoPostulante["tipo"]
): Promise<DocumentoPostulante> {
  // El archivo viaja al backend, que lo guarda en Amazon S3.
  const formulario = new FormData();
  formulario.append("tipo", tipo);
  formulario.append("archivo", archivo);
  const res = await fetch(`/api/postulantes/${encodeURIComponent(id)}/documentos`, {
    method: "POST",
    body: formulario, // sin "Content-Type": el navegador lo agrega solo, con su "boundary"
  });
  if (!res.ok) throw new Error(await mensajeDeError(res, "Error al subir el documento"));
  marcarVencido(`postulante:${id}`);
  return mapearDocumentoDeApi(await res.json(), id);
}

export async function replaceDocumento(
  id: string,
  documentoId: string,
  archivo: File
): Promise<DocumentoPostulante> {
  // Se sube el archivo nuevo a S3 y se borra el anterior.
  const formulario = new FormData();
  formulario.append("archivo", archivo);
  const res = await fetch(
    `/api/postulantes/${encodeURIComponent(id)}/documentos/${encodeURIComponent(documentoId)}/archivo`,
    { method: "PUT", body: formulario }
  );
  if (!res.ok) throw new Error(await mensajeDeError(res, "Error al reemplazar el documento"));
  marcarVencido(`postulante:${id}`);
  return mapearDocumentoDeApi(await res.json(), id);
}

export async function deleteDocumento(id: string, documentoId: string): Promise<void> {
  // Se elimina el documento y su archivo de S3.
  const res = await fetch(
    `/api/postulantes/${encodeURIComponent(id)}/documentos/${encodeURIComponent(documentoId)}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error(await mensajeDeError(res, "Error al eliminar el documento"));
  marcarVencido(`postulante:${id}`);
  return;
}

export async function addEvaluacion(id: string, evaluacion: NuevaEvaluacion): Promise<Evaluacion> {
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
  marcarVencido(`postulante:${id}`);
  marcarVencido("dashboard:");
  return mapearEvaluacionDeApi(await res.json());
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
  comentario?: string
): Promise<HistorialEstado> {
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
  marcarVencido(`postulante:${id}`);
  marcarVencido("postulantes:");
  marcarVencido("dashboard:");
  return mapearHistorialDeApi(await res.json());
}

// ============================================================
// CREAR NUEVO POSTULANTE
// ============================================================

export async function crearPostulante(
  data: PostulanteFormData
): Promise<Postulante> {
  // navegador -> /api/postulantes (Next.js) -> Gateway -> servicio-postulantes
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
  marcarVencido("postulantes:");
  marcarVencido("dashboard:");
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
// Postula (agrega) a un postulante a un anuncio: crea su postulación en la
// etapa "Postulado" (servicio-procesos-seleccion). Admin, RRHH y Supervisor,
// solo en anuncios de sus empresas asignadas; 409 si ya estaba postulado.
export async function postularAAnuncio(postulanteId: string, anuncioId: number): Promise<void> {
  const res = await fetch("/api/procesos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postulanteId, anuncioId }),
  });
  if (res.status === 401) throw new Error(sesionVencida());
  if (!res.ok) throw new Error(await mensajeDeError(res, "No se pudo agregar al anuncio"));
  marcarVencido(`postulante:${postulanteId}`);
  marcarVencido("postulantes:");
  marcarVencido("dashboard:");
}
