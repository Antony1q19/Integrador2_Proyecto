import { useEffect, useState } from "react";
import { Empresa } from "@/features/empresas/types/empresa";
import { listarEmpresas, eliminarEmpresa } from "@/features/empresas/services/empresasService";

export function useEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const datos = await listarEmpresas();
        if (!cancelado) setEmpresas(datos);
      } catch (err) {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : "Error al cargar empresas");
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

  // Elimina la empresa en el backend y, si tuvo éxito, la quita de la lista
  // en pantalla sin necesitar recargar todo el listado. Si el backend
  // rechaza el borrado (ej. 409 por anuncios activos), propaga el error
  // para que el componente lo muestre junto a la fila correspondiente.
  async function eliminar(id: number): Promise<void> {
    await eliminarEmpresa(id);
    setEmpresas((prev) => prev.filter((empresa) => empresa.id !== id));
  }

  return { empresas, cargando, error, eliminar };
}