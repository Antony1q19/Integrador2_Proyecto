// features/comunicaciones/components/ChatPanel.tsx
// Panel principal del chat
"use client";

import { RefObject, useEffect, useState } from "react";
import { Contacto, Mensaje, PlantillaMensaje } from "../types/comunicaciones.types";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { EmptyState } from "./EmptyState";
import { ChatSkeleton } from "./ChatSkeleton";
import { Clock, Eye, RotateCcw } from "lucide-react";
import { RetomarChatModal } from "./RetomarChatModal";
import { usePermisos } from "@/lib/usePermisos";

interface ChatPanelProps {
  contacto: Contacto | null;
  mensajes: Mensaje[];
  loading: boolean;
  enviando: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onSendMessage: (texto: string) => void;
  onInsertTemplate: (plantilla: PlantillaMensaje) => string;
  onPlantillaEnviada: (mensaje: Mensaje) => void;
}

// WhatsApp solo deja mandar texto libre durante las 24 h siguientes al último mensaje del postulante.
const VENTANA_MS = 24 * 60 * 60 * 1000;

// La hora actual, renovada cada minuto (para que la ventana de 24 h se cierre sola en pantalla).
function useAhora(): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(intervalo);
  }, []);
  return ahora;
}

const formatearCierre = (ms: number) =>
  new Date(ms).toLocaleString("es-PE", { weekday: "short", hour: "2-digit", minute: "2-digit" });

export function ChatPanel({
  contacto,
  mensajes,
  loading,
  enviando,
  messagesEndRef,
  onSendMessage,
  onInsertTemplate,
  onPlantillaEnviada,
}: ChatPanelProps) {
  const [retomando, setRetomando] = useState(false);
  const { puedeEscribirWhatsApp: puedeEscribir } = usePermisos();
  const ahora = useAhora();

  // Sin contacto seleccionado
  if (!contacto) {
    return <EmptyState />;
  }

  // Cargando
  if (loading && mensajes.length === 0) {
    return <ChatSkeleton />;
  }

  const nombreCompleto = `${contacto.nombre} ${contacto.apellido}`;
  const cierraEn = contacto.ultimoEntrante ? new Date(contacto.ultimoEntrante).getTime() + VENTANA_MS : 0;
  const ventanaAbierta = cierraEn > ahora;

  return (
    <div className="flex h-full flex-col">
      {/* Header del chat */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-purple-100 text-sm font-semibold text-primary-700">
            {contacto.nombre.charAt(0)}
            {contacto.apellido.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{nombreCompleto}</p>
            <p className={`flex items-center gap-1 text-xs ${ventanaAbierta ? "text-emerald-600" : "text-amber-600"}`}>
              <Clock className="h-3 w-3" />
              {ventanaAbierta
                ? `Puedes escribirle libremente hasta el ${formatearCierre(cierraEn)}`
                : "Más de 24 h sin respuesta: usa \"Retomar chat\""}
            </p>
          </div>
        </div>

        {puedeEscribir && (
          <button
            onClick={() => setRetomando(true)}
            title="Para escribirle si no ha respondido en las últimas 24 horas"
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              ventanaAbierta
                ? "border-slate-200 text-slate-600 hover:bg-slate-50"
                : "border-primary-600 bg-primary-600 text-white hover:bg-primary-700"
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            Retomar chat
          </button>
        )}
      </div>

      {/* Mensajes */}
      <ChatMessages mensajes={mensajes} messagesEndRef={messagesEndRef} />

      {/* Input: solo quien puede escribir y con la ventana de 24 h abierta (si no, WhatsApp no lo entrega) */}
      {!puedeEscribir ? (
        <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
          <Eye className="h-4 w-4" /> Tu rol puede ver los chats, pero no enviar mensajes.
        </div>
      ) : ventanaAbierta ? (
        <ChatInput onSendMessage={onSendMessage} onInsertTemplate={onInsertTemplate} enviando={enviando} />
      ) : (
        <div className="flex flex-col gap-2 border-t border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-amber-800">
            {contacto.ultimoEntrante
              ? "Pasaron más de 24 horas desde su último mensaje. WhatsApp no entregaría un mensaje normal."
              : "Este postulante aún no te ha escrito. WhatsApp solo permite iniciar la conversación con una plantilla."}{" "}
            Envía &quot;Retomar chat&quot;: cuando responda, podrás escribirle con normalidad.
          </p>
          <button
            onClick={() => setRetomando(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700"
          >
            <RotateCcw className="h-4 w-4" /> Retomar chat
          </button>
        </div>
      )}

      {retomando && (
        <RetomarChatModal
          contacto={contacto}
          onCerrar={() => setRetomando(false)}
          onEnviada={(mensaje) => {
            onPlantillaEnviada(mensaje);
            setRetomando(false);
          }}
        />
      )}
    </div>
  );
}
