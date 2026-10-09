// features/comunicaciones/services/comunicacionesService.ts
//
// Servicio conectado al backend real (servicio-comunicaciones a través del Gateway).
import { Contacto, Mensaje, PlantillaMensaje, PLANTILLAS } from "../types/comunicaciones.types";

// --- Formato que devuelve el backend ---
interface ConversacionBackend {
  id: string;
  postulante_id: string;
  nombre: string;
  telefono: string;
  ultima_actividad: string;
  no_leidos: number;
}

interface MensajeBackend {
  id: string;
  conversacion_id: string;
  remitente: "yo" | "contacto";
  texto: string;
  fecha: string;
  estado: "enviado" | "entregado" | "leido" | "fallido";
  wamid: string | null;
}

// --- Mapeo backend → frontend ---
function mapearConversacion(dto: ConversacionBackend): Contacto {
  const partes = dto.nombre.trim().split(/\s+/);
  const nombre = partes[0] ?? dto.nombre;
  const apellido = partes.slice(1).join(" ") || "";

  return {
    id: dto.id,
    nombre,
    apellido,
    telefono: dto.telefono,
    email: "",
    ultimaActividad: dto.ultima_actividad,
    noLeidos: dto.no_leidos,
    estado: "desconectado",
  };
}

function mapearMensaje(dto: MensajeBackend): Mensaje {
  return {
    id: dto.id,
    contactoId: dto.conversacion_id,
    remitente: dto.remitente,
    texto: dto.texto,
    fecha: dto.fecha,
    estado: dto.estado,
  };
}

// ============================================================
// OBTENER CONTACTOS (conversaciones)
// ============================================================
export async function fetchContactos(): Promise<Contacto[]> {
  const respuesta = await fetch('/api/comunicaciones', { method: 'GET' });
  if (!respuesta.ok) throw new Error('Error al cargar contactos');
  const dtos: ConversacionBackend[] = await respuesta.json();
  return dtos.map(mapearConversacion);
}

// ============================================================
// OBTENER MENSAJES DE UNA CONVERSACIÓN
// ============================================================
export async function fetchMensajesByContactoId(contactoId: string): Promise<Mensaje[]> {
  const respuesta = await fetch(`/api/comunicaciones/${contactoId}/mensajes`, { method: 'GET' });
  if (!respuesta.ok) throw new Error('Error al cargar mensajes');
  const dtos: MensajeBackend[] = await respuesta.json();
  return dtos.map(mapearMensaje);
}

// ============================================================
// ENVIAR MENSAJE
// ============================================================
export async function sendMessage(contactoId: string, texto: string): Promise<Mensaje> {
  const respuesta = await fetch(`/api/comunicaciones/${contactoId}/mensajes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto }),
  });
  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({}));
    throw new Error(error?.detail ?? 'Error al enviar mensaje');
  }
  const dto: MensajeBackend = await respuesta.json();
  return mapearMensaje(dto);
}

// ============================================================
// OBTENER PLANTILLAS
// ============================================================
export async function fetchPlantillas(): Promise<PlantillaMensaje[]> {
  return structuredClone(PLANTILLAS);
}

// ============================================================
// BUSCAR CONTACTOS (local, sobre los ya cargados)
// ============================================================
export async function searchContactos(query: string): Promise<Contacto[]> {
  const todos = await fetchContactos();
  const q = query.toLowerCase().trim();
  if (!q) return todos;
  return todos.filter(
    (c) =>
      c.nombre.toLowerCase().includes(q) ||
      c.apellido.toLowerCase().includes(q) ||
      c.telefono.includes(q)
  );
}