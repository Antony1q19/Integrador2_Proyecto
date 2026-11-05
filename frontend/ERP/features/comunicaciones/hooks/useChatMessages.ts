// features/comunicaciones/hooks/useChatMessages.ts
//
// Todo el estado de la pantalla de chats: la lista de conversaciones, el chat abierto y sus mensajes.
// La lista y los mensajes se refrescan solos cada pocos segundos (sin parpadeos), así se ven los
// mensajes que llegan por WhatsApp y los cambios de estado (✓ enviado, ✓✓ entregado, ✓✓ azul leído).
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Mensaje, Contacto, PlantillaMensaje } from "../types/comunicaciones.types";
import {
  sendMessage,
  fetchMensajesByContactoId,
  fetchContactos,
  marcarConversacionLeida,
} from "../services/comunicacionesService";
import { EVENTO_ABRIR_CHAT, fijarChatAbierto, publicarContactos } from "../avisosWhatsApp";

const REFRESCO_MS = 5000;

const coincide = (c: Contacto, q: string) =>
  `${c.nombre} ${c.apellido}`.toLowerCase().includes(q) || c.telefono.includes(q.replace(/\D/g, "") || q);

export function useChatMessages() {
  const [todos, setTodos] = useState<Contacto[]>([]);
  const [contactoSeleccionado, setContactoSeleccionado] = useState<Contacto | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [queryBusqueda, setQueryBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // El chat abierto y sus mensajes, para leerlos desde los temporizadores sin reiniciarlos.
  const seleccionadoRef = useRef<Contacto | null>(null);
  const mensajesRef = useRef<Mensaje[]>([]);
  // Última actividad conocida del chat abierto: si no cambia, no hace falta volver a pedir sus mensajes.
  const actividadRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    mensajesRef.current = mensajes;
  }, [mensajes]);

  // La búsqueda filtra en memoria: así el refresco automático no la pisa.
  const contactos = useMemo(() => {
    const q = queryBusqueda.toLowerCase().trim();
    return q ? todos.filter((c) => coincide(c, q)) : todos;
  }, [todos, queryBusqueda]);

  // ============================================================
  // ABRIR UN CHAT
  // ============================================================
  const abrir = useCallback(async (contacto: Contacto) => {
    seleccionadoRef.current = contacto;
    actividadRef.current = contacto.ultimaActividad;
    fijarChatAbierto(contacto.id);
    setContactoSeleccionado(contacto);
    setMensajes([]);
    setLoading(true);
    // Al abrirlo, sus mensajes quedan leídos (aquí y en el WhatsApp del postulante: ✓✓ azules).
    setTodos((prev) => prev.map((c) => (c.id === contacto.id ? { ...c, noLeidos: 0 } : c)));
    if (contacto.noLeidos > 0) marcarConversacionLeida(contacto.id).catch(() => {});
    try {
      setMensajes(await fetchMensajesByContactoId(contacto.id));
    } catch (err) {
      setError("Error al cargar mensajes");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const seleccionarContacto = useCallback(
    async (contacto: Contacto) => {
      setQueryBusqueda("");
      await abrir(contacto);
    },
    [abrir]
  );

  // Abrir un chat por su id (desde un aviso o desde /comunicaciones?c=<id>). Si todavía no está en
  // la lista (ej. una conversación recién creada), se vuelve a pedir la lista.
  const abrirPorId = useCallback(
    async (id: string) => {
      let lista = todos;
      if (!lista.some((c) => c.id === id)) {
        lista = await fetchContactos();
        setTodos(lista);
      }
      const contacto = lista.find((c) => c.id === id);
      if (contacto) await seleccionarContacto(contacto);
    },
    [todos, seleccionarContacto]
  );

  // ============================================================
  // CARGA INICIAL (y si se llegó con ?c=<id>, abrir ese chat)
  // ============================================================
  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      try {
        const data = await fetchContactos();
        if (cancelado) return;
        publicarContactos(data);
        setTodos(data);
        setLoading(false);

        const inicial = new URLSearchParams(window.location.search).get("c");
        const contacto = inicial ? data.find((c) => c.id === inicial) : undefined;
        if (contacto) {
          await abrir(contacto);
          window.history.replaceState(null, "", "/comunicaciones"); // que recargar no lo reabra
        }
      } catch (err) {
        if (!cancelado) {
          setError("Error al cargar contactos");
          console.error(err);
          setLoading(false);
        }
      }
    };

    cargar();
    return () => {
      cancelado = true;
      fijarChatAbierto(null); // al salir de la pantalla ya no hay chat abierto
    };
  }, [abrir]);

  // ============================================================
  // ABRIR DESDE UN AVISO (estando ya en esta pantalla)
  // ============================================================
  useEffect(() => {
    const alPedir = (e: Event) => abrirPorId((e as CustomEvent<string>).detail);
    window.addEventListener(EVENTO_ABRIR_CHAT, alPedir);
    return () => window.removeEventListener(EVENTO_ABRIR_CHAT, alPedir);
  }, [abrirPorId]);

  // ============================================================
  // REFRESCO AUTOMÁTICO: lista de chats + mensajes del chat abierto
  // ============================================================
  useEffect(() => {
    const refrescar = async () => {
      if (document.hidden) return;
      try {
        const lista = await fetchContactos();
        publicarContactos(lista); // el vigilante de avisos usa esta misma lista (sin pedirla otra vez)
        const abierto = seleccionadoRef.current;
        const actual = abierto ? lista.find((c) => c.id === abierto.id) : undefined;

        // Si el chat abierto recibió mensajes, ya los está viendo: se marcan leídos.
        if (actual && actual.noLeidos > 0) {
          marcarConversacionLeida(actual.id).catch(() => {});
          actual.noLeidos = 0;
        }
        setTodos(lista);

        // Los mensajes del chat abierto solo se vuelven a pedir si hubo actividad nueva o si alguno
        // de los enviados todavía espera su ✓✓ / ✓✓ azul (los estados no cambian la "última actividad").
        if (!actual) return;
        const esperaEstado = mensajesRef.current.some(
          (m) => m.remitente === "yo" && (m.estado === "enviado" || m.estado === "entregado")
        );
        if (actual.ultimaActividad === actividadRef.current && !esperaEstado) return;
        actividadRef.current = actual.ultimaActividad;
        const msgs = await fetchMensajesByContactoId(actual.id);
        // Solo si sigue abierto el mismo chat (pudo cambiar mientras llegaba la respuesta).
        if (seleccionadoRef.current?.id === actual.id) setMensajes(msgs);
      } catch {
        // Se reintenta en la próxima vuelta.
      }
    };

    const intervalo = setInterval(refrescar, REFRESCO_MS);
    return () => clearInterval(intervalo);
  }, []);

  // ============================================================
  // BUSCAR CONTACTOS
  // ============================================================
  const buscarContactos = useCallback((query: string) => {
    setQueryBusqueda(query);
  }, []);

  // ============================================================
  // ENVIAR MENSAJE
  // ============================================================
  const enviarMensaje = useCallback(async (texto: string) => {
    if (!contactoSeleccionado || !texto.trim()) return;

    setEnviando(true);
    try {
      const nuevoMensaje = await sendMessage(contactoSeleccionado.id, texto);
      setMensajes((prev) => [...prev, nuevoMensaje]);
      setTodos((prev) =>
        prev.map((c) =>
          c.id === contactoSeleccionado.id
            ? { ...c, ultimoMensaje: texto, ultimaActividad: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      setError("Error al enviar mensaje");
      console.error(err);
    } finally {
      setEnviando(false);
    }
  }, [contactoSeleccionado]);

  // ============================================================
  // AGREGAR UN MENSAJE YA ENVIADO (ej. una plantilla de WhatsApp)
  // ============================================================
  const agregarMensaje = useCallback((mensaje: Mensaje) => {
    setMensajes((prev) => [...prev, mensaje]);
    setTodos((prev) =>
      prev.map((c) =>
        c.id === mensaje.contactoId ? { ...c, ultimoMensaje: mensaje.texto, ultimaActividad: mensaje.fecha } : c
      )
    );
  }, []);

  // ============================================================
  // INSERTAR PLANTILLA (textos de ayuda locales)
  // ============================================================
  const insertarPlantilla = useCallback((plantilla: PlantillaMensaje) => {
    // Solo se completa el nombre: puesto, fecha, documentos... los escribe quien envía
    // (quedan como {puesto}, {fecha}... para que se vea qué falta).
    return contactoSeleccionado
      ? plantilla.contenido.replace(/{nombre}/g, contactoSeleccionado.nombre)
      : plantilla.contenido;
  }, [contactoSeleccionado]);

  return {
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
    agregarMensaje,
    insertarPlantilla,
    setQueryBusqueda,
  };
}
