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
  
  // Ref para scroll automático
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ============================================================
  // CARGAR CONTACTOS
  // ============================================================
  const cargarContactos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchContactos();
      setContactos(data);
    } catch (err) {
      setError("Error al cargar contactos");
      console.error(err);
    } finally {
      setLoading(false);
    }
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
  // CARGAR MENSAJES DE UN CONTACTO
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
      
      // Actualizar último mensaje en la lista de contactos
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
    // Reemplazar placeholders con datos del contacto
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

  // ============================================================
  // CARGA INICIAL
  // ============================================================
  useEffect(() => {
    cargarContactos();
  }, [cargarContactos]);

  // ============================================================
  // LIMPIAR BUSQUEDA AL SELECCIONAR CONTACTO
  // ============================================================
  useEffect(() => {
    if (contactoSeleccionado) {
      setQueryBusqueda("");
    }
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
    cargarContactos,
    buscarContactos,
    seleccionarContacto,
    enviarMensaje,
    insertarPlantilla,
    setQueryBusqueda,
  };
}