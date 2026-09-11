// features/comunicaciones/hooks/useChatMessages.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Mensaje, Contacto, PlantillaMensaje } from "../types/comunicaciones.types";
import { sendMessage, fetchMensajesByContactoId, fetchContactos, searchContactos } from "../services/comunicacionesService";

export function useChatMessages() {
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [contactoSeleccionado, setContactoSeleccionado] = useState<Contacto | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [queryBusqueda, setQueryBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ============================================================
  // CARGAR CONTACTOS - SIN hasLoadedRef (funciona con StrictMode)
  // ============================================================
  useEffect(() => {
    let cancelled = false;

    const cargar = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchContactos();
        if (!cancelled) {
          setContactos(data);
          setLoading(false); // ✅ Solo quitar loading si no se canceló
        }
      } catch (err) {
        if (!cancelled) {
          setError("Error al cargar contactos");
          console.error(err);
          setLoading(false);
        }
      }
    };

    cargar();

    return () => {
      cancelled = true;
    };
  }, []);

  // ============================================================
  // BUSCAR CONTACTOS
  // ============================================================
  const buscarContactos = useCallback(async (query: string) => {
    setQueryBusqueda(query);
    setLoading(true);
    try {
      const results = await searchContactos(query);
      setContactos(results);
    } catch (err) {
      setError("Error al buscar contactos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================
  // CARGAR MENSAJES
  // ============================================================
  const cargarMensajes = useCallback(async (contactoId: string) => {
    setLoading(true);
    try {
      const data = await fetchMensajesByContactoId(contactoId);
      setMensajes(data);
    } catch (err) {
      setError("Error al cargar mensajes");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================
  // SELECCIONAR CONTACTO
  // ============================================================
  const seleccionarContacto = useCallback(async (contacto: Contacto) => {
    setContactoSeleccionado(contacto);
    setQueryBusqueda("");
    await cargarMensajes(contacto.id);
  }, [cargarMensajes]);

  // ============================================================
  // ENVIAR MENSAJE
  // ============================================================
  const enviarMensaje = useCallback(async (texto: string) => {
    if (!contactoSeleccionado || !texto.trim()) return;

    setEnviando(true);
    try {
      const nuevoMensaje = await sendMessage(contactoSeleccionado.id, texto);
      setMensajes((prev) => [...prev, nuevoMensaje]);
      
      setContactos((prev) =>
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
  // INSERTAR PLANTILLA
  // ============================================================
  const insertarPlantilla = useCallback((plantilla: PlantillaMensaje) => {
    let contenido = plantilla.contenido;
    if (contactoSeleccionado) {
      contenido = contenido
        .replace(/{nombre}/g, `${contactoSeleccionado.nombre} ${contactoSeleccionado.apellido}`)
        .replace(/{fecha}/g, new Date().toLocaleDateString('es-PE'))
        .replace(/{hora}/g, new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }));
    }
    return contenido;
  }, [contactoSeleccionado]);

  // ============================================================
  // SCROLL AUTOMÁTICO
  // ============================================================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

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
    insertarPlantilla,
    setQueryBusqueda,
  };
}