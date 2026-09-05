// features/postulantes/hooks/usePostulantesList.ts
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Postulante } from "../types/postulante.types";
import { fetchPostulantes } from "../services/postulantesService";

export type SortableField =
  | "fechaRegistro"
  | "estadoActual"
  | "datosPersonales.apellidos"
  | "datosPersonales.cargoPostulado"
  | "datosPersonales.empresaCliente";

export interface FiltrosLista {
  estado: string;
  cargo: string;
  empresa: string;
  fechaInicio: string;
  fechaFin: string;
  search: string;
  sortBy: SortableField | "";
  sortOrder: "asc" | "desc";
}

interface UsePostulantesListReturn {
  postulantes: Postulante[];
  loading: boolean;
  error: string | null;
  filtros: FiltrosLista;
  actualizarFiltro: <K extends keyof FiltrosLista>(
    key: K,
    value: FiltrosLista[K]
  ) => void;
  limpiarFiltros: () => void;
  recargar: () => void;
  cambiarOrden: (field: SortableField) => void;
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  cambiarPagina: (page: number) => void;
  cambiarPageSize: (size: number) => void;
  estadosOptions: string[];
  cargosOptions: string[];
  empresasOptions: string[];
}

export function usePostulantesList(): UsePostulantesListReturn {
  const [allPostulantes, setAllPostulantes] = useState<Postulante[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  
  // Desglosar el estado de filtros en variables individuales
  const [estado, setEstado] = useState("");
  const [cargo, setCargo] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortableField | "">("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Construir objeto filtros para el retorno
  const filtros: FiltrosLista = {
    estado,
    cargo,
    empresa,
    fechaInicio,
    fechaFin,
    search,
    sortBy,
    sortOrder,
  };

  // Cargar datos (solo una vez)
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPostulantes();
        setAllPostulantes(data);
      } catch (err) {
        console.error("Error al cargar postulantes:", err);
        setError("Error al cargar los postulantes");
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []); // <- Dependencias vacías = solo una vez

  // ============================================================
  // FILTRADO Y ORDENAMIENTO - Con dependencias individuales
  // ============================================================
  const postulantesFiltrados = useMemo(() => {
    let resultados = [...allPostulantes];

    // BÚSQUEDA
    if (search.trim() !== "") {
      const searchLower = search.toLowerCase().trim();
      resultados = resultados.filter(
        (p) =>
          p.datosPersonales.nombres.toLowerCase().includes(searchLower) ||
          p.datosPersonales.apellidos.toLowerCase().includes(searchLower) ||
          p.datosPersonales.documentoNumero.includes(searchLower)
      );
    }

    // FILTRO POR ESTADO
    if (estado !== "") {
      resultados = resultados.filter((p) => p.estadoActual === estado);
    }

    // FILTRO POR CARGO
    if (cargo !== "") {
      resultados = resultados.filter(
        (p) => p.datosPersonales.cargoPostulado === cargo
      );
    }

    // FILTRO POR EMPRESA
    if (empresa !== "") {
      resultados = resultados.filter(
        (p) => p.datosPersonales.empresaCliente === empresa
      );
    }

    // FILTRO POR FECHA
    if (fechaInicio !== "") {
      resultados = resultados.filter((p) => p.fechaRegistro >= fechaInicio);
    }
    if (fechaFin !== "") {
      resultados = resultados.filter((p) => p.fechaRegistro <= fechaFin);
    }

    // ORDENAMIENTO
    if (sortBy) {
      resultados.sort((a, b) => {
        let aVal = "";
        let bVal = "";

        switch (sortBy) {
          case "fechaRegistro":
            aVal = a.fechaRegistro;
            bVal = b.fechaRegistro;
            break;
          case "estadoActual":
            aVal = a.estadoActual;
            bVal = b.estadoActual;
            break;
          case "datosPersonales.apellidos":
            aVal = a.datosPersonales.apellidos;
            bVal = b.datosPersonales.apellidos;
            break;
          case "datosPersonales.cargoPostulado":
            aVal = a.datosPersonales.cargoPostulado;
            bVal = b.datosPersonales.cargoPostulado;
            break;
          case "datosPersonales.empresaCliente":
            aVal = a.datosPersonales.empresaCliente;
            bVal = b.datosPersonales.empresaCliente;
            break;
        }

        const comparison = aVal.localeCompare(bVal);
        return sortOrder === "asc" ? comparison : -comparison;
      });
    }

    return resultados;
  }, [
    allPostulantes,
    search,
    estado,
    cargo,
    empresa,
    fechaInicio,
    fechaFin,
    sortBy,
    sortOrder,
  ]); // <- Dependencias individuales y estables

  // ============================================================
  // PAGINACIÓN
  // ============================================================
  const totalItems = postulantesFiltrados.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginaActual = Math.min(page, totalPages);
  const start = (paginaActual - 1) * pageSize;
  const end = start + pageSize;
  const postulantes = postulantesFiltrados.slice(start, end);

  // ============================================================
  // OPCIONES DE FILTROS
  // ============================================================
  const estadosOptions = useMemo(() => {
    return Array.from(new Set(allPostulantes.map((p) => p.estadoActual)));
  }, [allPostulantes]);

  const cargosOptions = useMemo(() => {
    return Array.from(
      new Set(allPostulantes.map((p) => p.datosPersonales.cargoPostulado))
    );
  }, [allPostulantes]);

  const empresasOptions = useMemo(() => {
    return Array.from(
      new Set(allPostulantes.map((p) => p.datosPersonales.empresaCliente))
    );
  }, [allPostulantes]);

  // ============================================================
  // ACTUALIZAR FILTRO
  // ============================================================
  const actualizarFiltro = useCallback(
    <K extends keyof FiltrosLista>(key: K, value: FiltrosLista[K]) => {
      // Usar los setters individuales según la key
      switch (key) {
        case "estado":
          setEstado(value as string);
          break;
        case "cargo":
          setCargo(value as string);
          break;
        case "empresa":
          setEmpresa(value as string);
          break;
        case "fechaInicio":
          setFechaInicio(value as string);
          break;
        case "fechaFin":
          setFechaFin(value as string);
          break;
        case "search":
          setSearch(value as string);
          break;
        case "sortBy":
          setSortBy(value as SortableField | "");
          break;
        case "sortOrder":
          setSortOrder(value as "asc" | "desc");
          break;
      }
      setPage(1);
    },
    []
  );

  // ============================================================
  // CAMBIAR ORDEN
  // ============================================================
  const cambiarOrden = useCallback((field: SortableField) => {
    setSortBy((prev) => field);
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    setPage(1);
  }, []);

  // ============================================================
  // LIMPIAR FILTROS
  // ============================================================
  const limpiarFiltros = useCallback(() => {
    setEstado("");
    setCargo("");
    setEmpresa("");
    setFechaInicio("");
    setFechaFin("");
    setSearch("");
    setSortBy("");
    setSortOrder("asc");
    setPage(1);
  }, []);

  // ============================================================
  // RECARGAR
  // ============================================================
  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPostulantes();
      setAllPostulantes(data);
    } catch (err) {
      console.error("Error al cargar postulantes:", err);
      setError("Error al cargar los postulantes");
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================
  // CAMBIAR PÁGINA
  // ============================================================
  const cambiarPagina = useCallback(
    (newPage: number) => {
      setPage(Math.max(1, Math.min(newPage, totalPages)));
    },
    [totalPages]
  );

  // ============================================================
  // CAMBIAR TAMAÑO DE PÁGINA
  // ============================================================
  const cambiarPageSize = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  return {
    postulantes,
    loading,
    error,
    filtros,
    actualizarFiltro,
    limpiarFiltros,
    recargar,
    cambiarOrden,
    page: paginaActual,
    pageSize,
    totalPages,
    totalItems,
    cambiarPagina,
    cambiarPageSize,
    estadosOptions,
    cargosOptions,
    empresasOptions,
  };
}