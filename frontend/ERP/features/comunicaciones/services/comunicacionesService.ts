// features/comunicaciones/services/comunicacionesService.ts
import { Contacto, Mensaje, Conversacion, PlantillaMensaje, PLANTILLAS } from "../types/comunicaciones.types";
import { mockContactos, mockMensajes } from "../data/mockData";

const LATENCIA_MOCK_MS = 300;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================
// OBTENER CONTACTOS
// ============================================================
export async function fetchContactos(): Promise<Contacto[]> {
  await delay(LATENCIA_MOCK_MS);
  return structuredClone(mockContactos);
}

// ============================================================
// OBTENER MENSAJES DE UN CONTACTO
// ============================================================
export async function fetchMensajesByContactoId(contactoId: string): Promise<Mensaje[]> {
  await delay(LATENCIA_MOCK_MS);
  const mensajes = mockMensajes[contactoId] || [];
  return structuredClone(mensajes);
}

// ============================================================
// ENVIAR MENSAJE
// ============================================================
export async function sendMessage(contactoId: string, texto: string): Promise<Mensaje> {
  await delay(LATENCIA_MOCK_MS);
  
  const nuevoMensaje: Mensaje = {
    id: `m${Date.now()}`,
    contactoId,
    remitente: "yo",
    texto,
    fecha: new Date().toISOString(),
    estado: "enviado",
  };

  // Simular entrega después de 2 segundos
  setTimeout(() => {
    nuevoMensaje.estado = "entregado";
  }, 2000);

  // Simular lectura después de 5 segundos
  setTimeout(() => {
    nuevoMensaje.estado = "leido";
  }, 5000);

  // Agregar al mock
  if (!mockMensajes[contactoId]) {
    mockMensajes[contactoId] = [];
  }
  mockMensajes[contactoId].push(nuevoMensaje);

  return nuevoMensaje;
}

// ============================================================
// OBTENER PLANTILLAS
// ============================================================
export async function fetchPlantillas(): Promise<PlantillaMensaje[]> {
  await delay(LATENCIA_MOCK_MS);
  return structuredClone(PLANTILLAS);
}

// ============================================================
// BUSCAR CONTACTOS
// ============================================================
export async function searchContactos(query: string): Promise<Contacto[]> {
  await delay(LATENCIA_MOCK_MS);
  const queryLower = query.toLowerCase().trim();
  if (!queryLower) return structuredClone(mockContactos);
  
  const resultados = mockContactos.filter(
    (c) =>
      c.nombre.toLowerCase().includes(queryLower) ||
      c.apellido.toLowerCase().includes(queryLower) ||
      c.telefono.includes(query)
  );
  return structuredClone(resultados);
}

// ============================================================
// OBTENER CONVERSACION COMPLETA
// ============================================================
export async function fetchConversacion(contactoId: string): Promise<Conversacion> {
  await delay(LATENCIA_MOCK_MS);
  
  const contacto = mockContactos.find((c) => c.id === contactoId);
  if (!contacto) throw new Error("Contacto no encontrado");
  
  const mensajes = mockMensajes[contactoId] || [];
  const ultimoMensaje = mensajes.length > 0 ? mensajes[mensajes.length - 1] : null;
  
  return {
    contacto: structuredClone(contacto),
    mensajes: structuredClone(mensajes),
    ultimoMensaje: ultimoMensaje ? structuredClone(ultimoMensaje) : {
      id: "",
      contactoId: "",
      remitente: "yo",
      texto: "No hay mensajes",
      fecha: new Date().toISOString(),
      estado: "enviado",
    },
  };
}