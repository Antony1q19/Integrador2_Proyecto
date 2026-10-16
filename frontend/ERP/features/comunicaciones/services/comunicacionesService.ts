// features/comunicaciones/services/comunicacionesService.ts
//
// Servicio conectado al backend real (servicio-comunicaciones a través del Gateway).
import { Contacto, Mensaje } from "../types/comunicaciones.types";

// --- Formato que devuelve el backend ---
interface ConversacionBackend {
  id: string;
  postulante_id: string;
  nombre: string;
  telefono: string;
  ultima_actividad: string;
  no_leidos: number;
  ultimo_mensaje: string | null;
  registrado: boolean;
  ultimo_entrante: string | null;
}

interface MensajeBackend {
  id: string;
  conversacion_id: string;
  remitente: "yo" | "contacto";
  texto: string;
  fecha: string;
  estado: "enviado" | "entregado" | "leido" | "fallido";
  wamid: string | null;
  error: string | null;
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
    ultimoMensaje: dto.ultimo_mensaje ?? undefined,
    noLeidos: dto.no_leidos,
    estado: "desconectado",
    registrado: dto.registrado,
    ultimoEntrante: dto.ultimo_entrante ?? undefined,
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
    error: dto.error,
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
// MARCAR CONVERSACIÓN COMO LEÍDA (y mandar el visto azul a WhatsApp)
// ============================================================
export async function marcarConversacionLeida(conversacionId: string): Promise<void> {
  await fetch(`/api/comunicaciones/${encodeURIComponent(conversacionId)}/leer`, { method: 'POST' });
}

// ============================================================
// ABRIR CONVERSACIÓN CON UN POSTULANTE (la crea si no existe)
// ============================================================
// Devuelve el id de la conversación. El backend pone el +51 si el teléfono no trae código de país.
export async function abrirConversacion(postulante: {
  id: string;
  nombre: string;
  telefono: string;
}): Promise<string> {
  const respuesta = await fetch('/api/comunicaciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      postulante_id: postulante.id,
      nombre: postulante.nombre,
      telefono: postulante.telefono,
    }),
  });
  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({}));
    throw new Error(error?.detail ?? 'No se pudo abrir la conversación');
  }
  const dto: ConversacionBackend = await respuesta.json();
  return dto.id;
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
