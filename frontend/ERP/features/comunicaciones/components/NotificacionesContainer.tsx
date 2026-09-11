// features/comunicaciones/components/NotificacionesContainer.tsx
"use client";

import { NotificacionToast } from "./NotificacionToast";
import { NotificacionMensaje } from "../types/notificaciones.types";

interface NotificacionesContainerProps {
  notificaciones: NotificacionMensaje[];
  onClose: (id: string) => void;
  onNotificacionClick: (contactoId: string) => void;
}

export function NotificacionesContainer({
  notificaciones,
  onClose,
  onNotificacionClick,
}: NotificacionesContainerProps) {
  if (notificaciones.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {notificaciones.map((notif) => (
        <NotificacionToast
          key={notif.id}
          notificacion={notif}
          onClose={() => onClose(notif.id)}
          onClick={() => {
            onNotificacionClick(notif.contactoId);
            onClose(notif.id);
          }}
        />
      ))}
    </div>
  );
}