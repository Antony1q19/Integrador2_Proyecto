// features/comunicaciones/components/ConversationItem.tsx
// Cada contacto de la lista
"use client";

import { Contacto } from "../types/comunicaciones.types";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface ConversationItemProps {
  contacto: Contacto;
  isSelected: boolean;
  onSelect: () => void;
}

// "51947757081" → "+51 947 757 081" (los demás países se muestran solo con el +).
const formatearTelefono = (telefono: string) =>
  /^51\d{9}$/.test(telefono)
    ? `+51 ${telefono.slice(2, 5)} ${telefono.slice(5, 8)} ${telefono.slice(8)}`
    : `+${telefono}`;

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
        isSelected ? "bg-primary-50" : ""
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-purple-100 text-primary-700 font-semibold text-sm">
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
          <p className={`truncate text-sm text-slate-900 ${contacto.noLeidos > 0 ? "font-semibold" : "font-medium"}`}>
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
        <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
          {formatearTelefono(contacto.telefono)}
          {contacto.registrado === false && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
              No registrado
            </span>
          )}
        </p>
      </div>

      {/* Badge de no leídos */}
      {contacto.noLeidos > 0 && (
        <span className="flex-shrink-0 rounded-full bg-primary-600 px-2 py-0.5 text-xs font-medium text-white">
          {contacto.noLeidos}
        </span>
      )}
    </button>
  );
}