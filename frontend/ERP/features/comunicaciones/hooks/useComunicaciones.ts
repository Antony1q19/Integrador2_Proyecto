// features/comunicaciones/hooks/useComunicaciones.ts
"use client";

import { useState, useEffect } from "react";
import { fetchContactos, fetchPlantillas } from "../services/comunicacionesService";
import { Contacto, PlantillaMensaje } from "../types/comunicaciones.types";

export function useComunicaciones() {
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [plantillas, setPlantillas] = useState<PlantillaMensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const cargar = async () => {
      setLoading(true);
      setError(null);
      try {
        const [contactosData, plantillasData] = await Promise.all([
          fetchContactos(),
          fetchPlantillas(),
        ]);
        if (!cancelled) {
          setContactos(contactosData);
          setPlantillas(plantillasData);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Error al cargar datos de comunicaciones");
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

  return {
    contactos,
    plantillas,
    loading,
    error,
  };
}