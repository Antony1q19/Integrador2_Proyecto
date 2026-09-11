// features/comunicaciones/components/ConversationList.tsx
"use client";

import { Contacto } from "../types/comunicaciones.types";
import { ConversationItem } from "./ConversationItem";

interface ConversationListProps {
  contactos: Contacto[];
  contactoSeleccionadoId?: string;
  onSelectContact: (contacto: Contacto) => void;
  loading: boolean;
  queryBusqueda: string;
}

export function ConversationList({
  contactos,
  contactoSeleccionadoId,
  onSelectContact,
  loading,
  queryBusqueda,
}: ConversationListProps) {
  if (loading && contactos.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-slate-500">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <span>Cargando conversaciones...</span>
        </div>
      </div>
    );
  }

  if (contactos.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-500">
        <div>
          <p className="font-medium">No hay conversaciones</p>
          <p className="mt-1 text-xs">
            {queryBusqueda
              ? "No se encontraron contactos con esa búsqueda"
              : "Selecciona un postulante para iniciar una conversación"}
          </p>
        </div>
      </div>
    );
  }

  return (
    // Quitamos overflow-y-auto, el padre ya lo maneja
    <div className="divide-y divide-slate-100">
      {contactos.map((contacto) => (
        <ConversationItem
          key={contacto.id}
          contacto={contacto}
          isSelected={contacto.id === contactoSeleccionadoId}
          onSelect={() => onSelectContact(contacto)}
        />
      ))}
    </div>
  );
}