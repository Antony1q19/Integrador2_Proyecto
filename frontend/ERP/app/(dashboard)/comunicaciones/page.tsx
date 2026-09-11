// app/comunicaciones/page.tsx
"use client";

import { useEffect } from "react";
import { useChatMessages } from "@/features/comunicaciones/hooks/useChatMessages";
import { useNotificaciones } from "@/features/comunicaciones/hooks/useNotificaciones";
import { ConversationList } from "@/features/comunicaciones/components/ConversationList";
import { ChatPanel } from "@/features/comunicaciones/components/ChatPanel";
import { NotificacionesContainer } from "@/features/comunicaciones/components/NotificacionesContainer";

export default function ComunicacionesPage() {
  const {
    contactos,
    contactoSeleccionado,
    mensajes,
    loading,
    enviando,
    error,
    queryBusqueda,
    messagesEndRef,
    buscarContactos,
    seleccionarContacto,
    enviarMensaje,
    insertarPlantilla,
  } = useChatMessages();

  const {
    notificaciones,
    eliminarNotificacion,
  } = useNotificaciones();

  // Manejar click en notificación
  const handleNotificacionClick = (contactoId: string) => {
    const contacto = contactos.find((c) => c.id === contactoId);
    if (contacto) {
      seleccionarContacto(contacto);
    }
  };

  if (error) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <span className="text-2xl">😔</span>
          </div>
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-[calc(100vh-8rem)] overflow-hidden p-4 md:p-6">
        <div className="flex h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Lista de conversaciones */}
          <div className="flex h-full w-full flex-col border-r border-slate-200 sm:w-80 md:w-96">
            <div className="flex-shrink-0 border-b border-slate-200 p-4">
              <input
                type="text"
                value={queryBusqueda}
                onChange={(e) => buscarContactos(e.target.value)}
                placeholder="Buscar contacto..."
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              <ConversationList
                contactos={contactos}
                contactoSeleccionadoId={contactoSeleccionado?.id}
                onSelectContact={seleccionarContacto}
                loading={loading}
                queryBusqueda={queryBusqueda}
              />
            </div>
          </div>

          {/* Panel de chat */}
          <div className="hidden h-full flex-1 sm:block">
            <ChatPanel
              contacto={contactoSeleccionado}
              mensajes={mensajes}
              loading={loading}
              enviando={enviando}
              messagesEndRef={messagesEndRef}
              onSendMessage={enviarMensaje}
              onInsertTemplate={insertarPlantilla}
            />
          </div>
        </div>
      </div>

      {/* Notificaciones flotantes */}
      <NotificacionesContainer
        notificaciones={notificaciones}
        onClose={eliminarNotificacion}
        onNotificacionClick={handleNotificacionClick}
      />
    </>
  );
}