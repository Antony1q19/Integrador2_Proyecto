// features/comunicaciones/hooks/useComunicaciones.ts
"use client";

import { useCallback } from "react";
import { fetchContactos, fetchPlantillas } from "../services/comunicacionesService";
import { Contacto, PlantillaMensaje } from "../types/comunicaciones.types";
import { useState, useEffect } from "react";

/**
 * Hook auxiliar para obtener datos generales de comunicaciones
 * (contactos y plantillas) sin la lógica de chat.
 */
export function useComunicaciones() {
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [plantillas, setPlantillas] = useState<PlantillaMensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [contactosData, plantillasData] = await Promise.all([
        fetchContactos(),
        fetchPlantillas(),
      ]);
      setContactos(contactosData);
      setPlantillas(plantillasData);
    } catch (err) {
      setError("Error al cargar datos de comunicaciones");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return {
    contactos,
    plantillas,
    loading,
    error,
    recargar: cargar,
  };
}