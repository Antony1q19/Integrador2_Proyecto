// features/comunicaciones/components/ChatPanel.tsx
"use client";

import { RefObject } from "react";
import { Contacto, Mensaje, PlantillaMensaje } from "../types/comunicaciones.types";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { EmptyState } from "./EmptyState";
import { ChatSkeleton } from "./ChatSkeleton";
import { Phone, Video, MoreVertical } from "lucide-react";

interface ChatPanelProps {
  contacto: Contacto | null;
  mensajes: Mensaje[];
  loading: boolean;
  enviando: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onSendMessage: (texto: string) => void;
  onInsertTemplate: (plantilla: PlantillaMensaje) => string;
}

const estadoTexto: Record<Contacto["estado"], string> = {
  en_linea: "En línea",
  ausente: "Ausente",
  desconectado: "Desconectado",
};

export function ChatPanel({
  contacto,
  mensajes,
  loading,
  enviando,
  messagesEndRef,
  onSendMessage,
  onInsertTemplate,
}: ChatPanelProps) {
  // Sin contacto seleccionado
  if (!contacto) {
    return <EmptyState />;
  }

  // Cargando
  if (loading && mensajes.length === 0) {
    return <ChatSkeleton />;
  }

  const nombreCompleto = `${contacto.nombre} ${contacto.apellido}`;

  return (
    <div className="flex h-full flex-col">
      {/* Header del chat */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-sm font-semibold text-indigo-700">
            {contacto.nombre.charAt(0)}
            {contacto.apellido.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {nombreCompleto}
            </p>
            <p className="text-xs text-slate-500">
              {estadoTexto[contacto.estado]}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
            <Phone className="h-4 w-4" />
          </button>
          <button className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
            <Video className="h-4 w-4" />
          </button>
          <button className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mensajes */}
      <ChatMessages mensajes={mensajes} messagesEndRef={messagesEndRef} />

      {/* Input */}
      <ChatInput
        onSendMessage={onSendMessage}
        onInsertTemplate={onInsertTemplate}
        enviando={enviando}
      />
    </div>
  );
}