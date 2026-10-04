import { useEffect, useState } from "react";
import { Anuncio, EstadoAnuncio } from "@/features/anuncios/types/anuncio";
import {
  listarAnuncios,
  eliminarAnuncio,
  cambiarEstadoAnuncio,
} from "@/features/anuncios/services/anunciosService";

export function useAnuncios() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const datos = await listarAnuncios();
        if (!cancelado) setAnuncios(datos);
      } catch (err) {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : "Error al cargar anuncios");
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, []);

  async function eliminar(id: number): Promise<void> {
    await eliminarAnuncio(id);
    setAnuncios((prev) => prev.filter((anuncio) => anuncio.id !== id));
  }

  async function cambiarEstado(id: number, estado: EstadoAnuncio): Promise<void> {
    const actualizado = await cambiarEstadoAnuncio(id, estado);
    setAnuncios((prev) => prev.map((anuncio) => (anuncio.id === id ? actualizado : anuncio)));
  }

  return { anuncios, cargando, error, eliminar, cambiarEstado };
}