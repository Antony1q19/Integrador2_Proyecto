// features/comunicaciones/hooks/useNotificaciones.ts
//
// Lista de avisos flotantes de mensajes nuevos. Cada aviso se cierra solo a los pocos segundos
// (o al hacer clic). Quién los genera: components/AvisosWhatsApp.tsx, con mensajes reales.
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NotificacionMensaje } from "../types/notificaciones.types";

const DURACION_MS = 8000;

export function useNotificaciones() {
  const [notificaciones, setNotificaciones] = useState<NotificacionMensaje[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const eliminarNotificacion = useCallback((id: string) => {
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
    setNotificaciones((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const agregarNotificacion = useCallback((notif: NotificacionMensaje) => {
    // Un solo aviso por chat: si ya había uno de esa conversación, se reemplaza por el nuevo.
    setNotificaciones((prev) => [notif, ...prev.filter((n) => n.contactoId !== notif.contactoId)].slice(0, 4));

    const timeout = setTimeout(() => {
      setNotificaciones((prev) => prev.filter((n) => n.id !== notif.id));
      timeoutRefs.current.delete(notif.id);
    }, DURACION_MS);

    timeoutRefs.current.set(notif.id, timeout);
  }, []);

  // Limpiar los temporizadores al desmontar.
  useEffect(() => {
    const timeouts = timeoutRefs.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
    };
  }, []);

  return {
    notificaciones,
    agregarNotificacion,
    eliminarNotificacion,
  };
}
