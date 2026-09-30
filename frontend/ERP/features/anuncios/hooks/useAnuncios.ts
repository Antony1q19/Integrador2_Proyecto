import { useEffect, useState } from "react";
import { Anuncio } from "@/features/anuncios/types/anuncio";
import { listarAnuncios, eliminarAnuncio } from "@/features/anuncios/services/anunciosService";

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

  return { anuncios, cargando, error, eliminar };
}