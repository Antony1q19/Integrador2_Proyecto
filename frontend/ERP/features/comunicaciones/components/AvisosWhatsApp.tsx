// features/comunicaciones/components/AvisosWhatsApp.tsx
//
// Vigila, en TODO el ERP, si llegaron mensajes de WhatsApp nuevos: cada pocos segundos pide las
// conversaciones y, si una tiene más no leídos que antes, muestra un aviso abajo a la derecha.
// Al hacer clic en el aviso se abre ese chat. También mantiene el contador del menú lateral.
"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchContactos } from "../services/comunicacionesService";
import { useNotificaciones } from "../hooks/useNotificaciones";
import { NotificacionesContainer } from "./NotificacionesContainer";
import { alPublicarContactos, fijarTotalNoLeidos, obtenerChatAbierto, pedirAbrirChat } from "../avisosWhatsApp";
import { Contacto } from "../types/comunicaciones.types";

const CADA_MS = 8000;

export function AvisosWhatsApp() {
  const router = useRouter();
  const pathname = usePathname();
  const { notificaciones, agregarNotificacion, eliminarNotificacion } = useNotificaciones();
  // No leídos de cada conversación en la revisión anterior (null = aún no hubo ninguna:
  // la primera revisión solo "toma nota", para no avisar de mensajes viejos al entrar).
  const anteriores = useRef<Map<string, number> | null>(null);

  const enPantallaDeChats = pathname === "/comunicaciones";

  useEffect(() => {
    let activo = true;

    // Compara con la revisión anterior y avisa de los chats que tienen más no leídos.
    const procesar = (contactos: Contacto[]) => {
      if (!activo) return;
      const abierto = obtenerChatAbierto();
      fijarTotalNoLeidos(contactos.reduce((total, c) => total + (c.id === abierto ? 0 : c.noLeidos), 0));

      if (anteriores.current) {
        for (const c of contactos) {
          const antes = anteriores.current.get(c.id) ?? 0;
          if (c.noLeidos > antes && c.id !== abierto) {
            agregarNotificacion({
              id: `${c.id}-${Date.now()}`,
              contactoId: c.id,
              contactoNombre: `${c.nombre} ${c.apellido}`.trim(),
              texto: c.ultimoMensaje ?? "Nuevo mensaje",
              fecha: new Date().toISOString(),
              leida: false,
            });
          }
        }
      }
      anteriores.current = new Map(contactos.map((c) => [c.id, c.noLeidos]));
    };

    // En la pantalla de chats, esa pantalla ya pide la lista: se usa la suya (sin petición extra).
    if (enPantallaDeChats) {
      const dejar = alPublicarContactos(procesar);
      return () => {
        activo = false;
        dejar();
      };
    }

    const revisar = async () => {
      if (document.hidden) return; // pestaña en segundo plano: no gastar peticiones
      try {
        procesar(await fetchContactos());
      } catch {
        // Sin sesión o el servicio no responde: se vuelve a intentar en la próxima vuelta.
      }
    };

    revisar();
    const intervalo = setInterval(revisar, CADA_MS);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, [agregarNotificacion, enPantallaDeChats]);

  const abrirChat = (conversacionId: string) => {
    if (enPantallaDeChats) {
      pedirAbrirChat(conversacionId);
    } else {
      router.push(`/comunicaciones?c=${encodeURIComponent(conversacionId)}`);
    }
  };

  return (
    <NotificacionesContainer
      notificaciones={notificaciones}
      onClose={eliminarNotificacion}
      onNotificacionClick={abrirChat}
    />
  );
}
