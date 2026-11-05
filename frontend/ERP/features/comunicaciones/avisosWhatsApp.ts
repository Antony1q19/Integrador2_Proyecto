// features/comunicaciones/avisosWhatsApp.ts
//
// Estado compartido (en memoria del navegador) entre tres partes que no se conocen entre sí:
//   - el vigilante de mensajes nuevos (AvisosWhatsApp, montado en el layout del ERP),
//   - la pantalla de chats (useChatMessages),
//   - el menú lateral (contador de no leídos).
import { useSyncExternalStore } from "react";
import type { Contacto } from "./types/comunicaciones.types";

let chatAbierto: string | null = null;
let totalNoLeidos = 0;
const oyentes = new Set<() => void>();

function avisar() {
  oyentes.forEach((oyente) => oyente());
}

function suscribirse(oyente: () => void) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

// --- Chat que el usuario tiene abierto ahora (no se avisa de mensajes de ese chat) ---
export function fijarChatAbierto(id: string | null): void {
  chatAbierto = id;
}

export function obtenerChatAbierto(): string | null {
  return chatAbierto;
}

// --- Total de mensajes sin leer (para el contador del menú) ---
export function fijarTotalNoLeidos(total: number): void {
  if (total !== totalNoLeidos) {
    totalNoLeidos = total;
    avisar();
  }
}

export function useTotalNoLeidos(): number {
  return useSyncExternalStore(suscribirse, () => totalNoLeidos, () => 0);
}

// --- Pedirle a la pantalla de chats (si está abierta) que abra una conversación ---
export const EVENTO_ABRIR_CHAT = "talenterp:abrir-chat";

export function pedirAbrirChat(conversacionId: string): void {
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_CHAT, { detail: conversacionId }));
}

// --- La pantalla de chats ya pide la lista de conversaciones cada pocos segundos: la comparte aquí
// para que el vigilante de avisos no haga la MISMA petición otra vez mientras esa pantalla está abierta.
const oyentesDeLista = new Set<(lista: Contacto[]) => void>();

export function publicarContactos(lista: Contacto[]): void {
  oyentesDeLista.forEach((oyente) => oyente(lista));
}

export function alPublicarContactos(oyente: (lista: Contacto[]) => void): () => void {
  oyentesDeLista.add(oyente);
  return () => oyentesDeLista.delete(oyente);
}
