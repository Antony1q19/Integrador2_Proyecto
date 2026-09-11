// features/comunicaciones/types/notificaciones.types.ts
export interface NotificacionMensaje {
  id: string;
  contactoId: string;
  contactoNombre: string;
  texto: string;
  fecha: string;
  leida: boolean;
}