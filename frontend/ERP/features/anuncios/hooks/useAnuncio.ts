import { useEffect, useState } from "react";
import { Anuncio, EstadoAnuncio } from "@/features/anuncios/types/anuncio";
import { obtenerAnuncio, cambiarEstadoAnuncio } from "@/features/anuncios/services/anunciosService";

export function useAnuncio(id: number) {
  const [anuncio, setAnuncio] = useState<Anuncio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      setError(null);
      setNoEncontrado(false);
      try {
        const datos = await obtenerAnuncio(id);
        if (!cancelado) setAnuncio(datos);
      } catch (err) {
        if (cancelado) return;
        const mensaje = err instanceof Error ? err.message : "Error al cargar el anuncio";
        if (mensaje.toLowerCase().includes("no encontrad")) {
          setNoEncontrado(true);
        } else {
          setError(mensaje);
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [id]);

  async function cambiarEstado(estado: EstadoAnuncio): Promise<void> {
    const actualizado = await cambiarEstadoAnuncio(id, estado);
    setAnuncio(actualizado);
  }

  return { anuncio, cargando, error, noEncontrado, cambiarEstado };
}