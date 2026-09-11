// features/comunicaciones/hooks/useNotificaciones.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NotificacionMensaje } from "../types/notificaciones.types";

export function useNotificaciones() {
  const [notificaciones, setNotificaciones] = useState<NotificacionMensaje[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Simular recepción de mensajes (solo para demo)
  useEffect(() => {
    const interval = setInterval(() => {
      // 10% de probabilidad de simular un mensaje nuevo cada 15 segundos
      if (Math.random() < 0.1) {
        const contactosDemo = [
          { id: "1", nombre: "Camila Rodríguez" },
          { id: "3", nombre: "Valeria Chumpitaz" },
          { id: "5", nombre: "Ana Belén Quispe" },
        ];
        const randomContacto = contactosDemo[Math.floor(Math.random() * contactosDemo.length)];
        
        agregarNotificacion({
          id: `notif-${Date.now()}`,
          contactoId: randomContacto.id,
          contactoNombre: randomContacto.nombre,
          texto: "Nuevo mensaje recibido",
          fecha: new Date().toISOString(),
          leida: false,
        });
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const agregarNotificacion = useCallback((notif: NotificacionMensaje) => {
    setNotificaciones((prev) => [notif, ...prev]);

    // Auto-eliminar después de 5 segundos
    const timeout = setTimeout(() => {
      setNotificaciones((prev) => prev.filter((n) => n.id !== notif.id));
      timeoutRefs.current.delete(notif.id);
    }, 5000);

    timeoutRefs.current.set(notif.id, timeout);
  }, []);

  const eliminarNotificacion = useCallback((id: string) => {
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
    setNotificaciones((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const marcarComoLeida = useCallback((id: string) => {
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );
  }, []);

  return {
    notificaciones,
    agregarNotificacion,
    eliminarNotificacion,
    marcarComoLeida,
  };
}