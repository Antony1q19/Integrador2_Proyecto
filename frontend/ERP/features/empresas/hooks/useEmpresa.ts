import { useEffect, useState } from "react";
import { Empresa } from "@/features/empresas/types/empresa";
import { obtenerEmpresa } from "@/features/empresas/services/empresasService";

export function useEmpresa(id: number) {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noEncontrada, setNoEncontrada] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      setError(null);
      setNoEncontrada(false);
      try {
        const datos = await obtenerEmpresa(id);
        if (!cancelado) setEmpresa(datos);
      } catch (err) {
        if (cancelado) return;
        // El backend responde 404 con {"detail": "Empresa X no encontrada"};
        // detectamos ese caso puntual para mostrar la página 404, en vez del
        // mensaje de error genérico.
        const mensaje = err instanceof Error ? err.message : "Error al cargar la empresa";
        if (mensaje.toLowerCase().includes("no encontrad")) {
          setNoEncontrada(true);
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

  return { empresa, cargando, error, noEncontrada };
}