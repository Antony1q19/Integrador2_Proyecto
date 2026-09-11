// features/comunicaciones/components/ChatMessages.tsx
"use client";

import { RefObject } from "react";
import { Mensaje } from "../types/comunicaciones.types";
import { Check, CheckCheck, Clock, XCircle } from "lucide-react";

interface ChatMessagesProps {
  mensajes: Mensaje[];
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

const getEstadoIcon = (estado: Mensaje["estado"]) => {
  switch (estado) {
    case "enviado":
      return <Check className="h-3 w-3 text-slate-400" />;
    case "entregado":
      return <CheckCheck className="h-3 w-3 text-slate-400" />;
    case "leido":
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    case "fallido":
      return <XCircle className="h-3 w-3 text-red-500" />;
    default:
      return <Clock className="h-3 w-3 text-slate-400" />;
  }
};

const formatearHora = (fecha: string) => {
  return new Date(fecha).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatearFecha = (fecha: string) => {
  const date = new Date(fecha);
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);

  if (date.toDateString() === hoy.toDateString()) {
    return "Hoy";
  }
  if (date.toDateString() === ayer.toDateString()) {
    return "Ayer";
  }
  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
  });
};

export function ChatMessages({ mensajes, messagesEndRef }: ChatMessagesProps) {
  // Agrupar mensajes por fecha
  const mensajesAgrupados = mensajes.reduce<Record<string, Mensaje[]>>(
    (acc, mensaje) => {
      const fecha = new Date(mensaje.fecha).toDateString();
      if (!acc[fecha]) {
        acc[fecha] = [];
      }
      acc[fecha].push(mensaje);
      return acc;
    },
    {}
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#e5ddd5] p-4">
      {Object.entries(mensajesAgrupados).map(([fecha, mensajesDelDia]) => (
        <div key={fecha}>
          {/* Separador de fecha */}
          <div className="my-4 flex justify-center">
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              {formatearFecha(mensajesDelDia[0].fecha)}
            </span>
          </div>

          {/* Mensajes del día */}
          {mensajesDelDia.map((mensaje) => {
            const esMio = mensaje.remitente === "yo";
            return (
              <div
                key={mensaje.id}
                className={`mb-2 flex ${esMio ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 shadow-sm ${
                    esMio
                      ? "bg-[#dcf8c6] text-slate-800 rounded-tr-none"
                      : "bg-white text-slate-800 rounded-tl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {mensaje.texto}
                  </p>
                  <div
                    className={`mt-1 flex items-center justify-end gap-1 ${
                      esMio ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    <span className="text-[10px]">
                      {formatearHora(mensaje.fecha)}
                    </span>
                    {esMio && getEstadoIcon(mensaje.estado)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}