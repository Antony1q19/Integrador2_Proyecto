// features/comunicaciones/components/ConversationItem.tsx
"use client";

import { Contacto } from "../types/comunicaciones.types";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface ConversationItemProps {
  contacto: Contacto;
  isSelected: boolean;
  onSelect: () => void;
}

const getEstadoColor = (estado: Contacto["estado"]) => {
  const colors = {
    en_linea: "bg-green-500",
    ausente: "bg-yellow-500",
    desconectado: "bg-slate-400",
  };
  return colors[estado];
};

export function ConversationItem({
  contacto,
  isSelected,
  onSelect,
}: ConversationItemProps) {
  const nombreCompleto = `${contacto.nombre} ${contacto.apellido}`;
  
  return (
    <button
      onClick={onSelect}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
        isSelected ? "bg-indigo-50" : ""
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 font-semibold text-sm">
          {contacto.nombre.charAt(0)}
          {contacto.apellido.charAt(0)}
        </div>
        <span
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${getEstadoColor(
            contacto.estado
          )}`}
        />
      </div>

      {/* Información */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-medium text-slate-900">
            {nombreCompleto}
          </p>
          {contacto.ultimaActividad && (
            <span className="text-xs text-slate-400">
              {formatDistanceToNow(new Date(contacto.ultimaActividad), {
                addSuffix: true,
                locale: es,
              })}
            </span>
          )}
        </div>
        {contacto.ultimoMensaje && (
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {contacto.ultimoMensaje}
          </p>
        )}
        <p className="mt-0.5 text-xs text-slate-400">
          {contacto.telefono}
        </p>
      </div>

      {/* Badge de no leídos */}
      {contacto.noLeidos > 0 && (
        <span className="flex-shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
          {contacto.noLeidos}
        </span>
      )}
    </button>
  );
}