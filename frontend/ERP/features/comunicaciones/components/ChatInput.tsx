// features/comunicaciones/components/ChatInput.tsx
"use client";

import { useState, KeyboardEvent } from "react";
import { Send, Smile } from "lucide-react";
import { MessageTemplates } from "./MessageTemplates";
import { PlantillaMensaje } from "../types/comunicaciones.types";

interface ChatInputProps {
  onSendMessage: (texto: string) => void;
  onInsertTemplate: (plantilla: PlantillaMensaje) => string;
  enviando: boolean;
}

export function ChatInput({
  onSendMessage,
  onInsertTemplate,
  enviando,
}: ChatInputProps) {
  const [texto, setTexto] = useState("");

  const handleSend = () => {
    if (!texto.trim() || enviando) return;
    onSendMessage(texto.trim());
    setTexto("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectTemplate = (plantilla: PlantillaMensaje) => {
    const contenido = onInsertTemplate(plantilla);
    setTexto(contenido);
  };

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      <div className="flex items-end gap-2">
        {/* Plantillas */}
        <MessageTemplates
          onSelectTemplate={handleSelectTemplate}
          disabled={enviando}
        />

        {/* Input de texto */}
        <div className="flex flex-1 items-end rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            rows={1}
            disabled={enviando}
            className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
          />
          <button
            type="button"
            className="ml-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Smile className="h-5 w-5" />
          </button>
        </div>

        {/* Botón enviar */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!texto.trim() || enviando}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {enviando ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}