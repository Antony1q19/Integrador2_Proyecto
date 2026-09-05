import { useState, useMemo } from "react";
import { Anuncio, EstadoAnuncio } from "@/features/anuncios/types/anuncio";

export interface FiltrosAnuncios {
  busqueda: string;
  empresaId: number | "todas";
  cargo: string | "todos";
  estado: EstadoAnuncio | "todos";
  fechaDesde: string;
  fechaHasta: string;
}

const filtrosIniciales: FiltrosAnuncios = {
  busqueda: "",
  empresaId: "todas",
  cargo: "todos",
  estado: "todos",
  fechaDesde: "",
  fechaHasta: "",
};

export function useAnunciosFilters(anuncios: Anuncio[]) {
  const [filtros, setFiltros] = useState<FiltrosAnuncios>(filtrosIniciales);

  const cargosDisponibles = useMemo(() => {
    const unicos = new Set(anuncios.map((a) => a.cargo));
    return Array.from(unicos);
  }, [anuncios]);

  const anunciosFiltrados = useMemo(() => {
    return anuncios.filter((anuncio) => {
      const coincideBusqueda =
        filtros.busqueda.trim() === "" ||
        anuncio.cargo.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
        anuncio.empresaRazonSocial
          .toLowerCase()
          .includes(filtros.busqueda.toLowerCase());

      const coincideEmpresa =
        filtros.empresaId === "todas" || anuncio.empresaId === filtros.empresaId;

      const coincideCargo =
        filtros.cargo === "todos" || anuncio.cargo === filtros.cargo;

      const coincideEstado =
        filtros.estado === "todos" || anuncio.estado === filtros.estado;

      const coincideFechaDesde =
        filtros.fechaDesde === "" || anuncio.fechaLimite >= filtros.fechaDesde;

      const coincideFechaHasta =
        filtros.fechaHasta === "" || anuncio.fechaLimite <= filtros.fechaHasta;

      return (
        coincideBusqueda &&
        coincideEmpresa &&
        coincideCargo &&
        coincideEstado &&
        coincideFechaDesde &&
        coincideFechaHasta
      );
    });
  }, [anuncios, filtros]);

  const actualizarFiltro = <K extends keyof FiltrosAnuncios>(
    campo: K,
    valor: FiltrosAnuncios[K]
  ) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  };

  const limpiarFiltros = () => setFiltros(filtrosIniciales);

  return {
    filtros,
    actualizarFiltro,
    limpiarFiltros,
    cargosDisponibles,
    anunciosFiltrados,
  };
}