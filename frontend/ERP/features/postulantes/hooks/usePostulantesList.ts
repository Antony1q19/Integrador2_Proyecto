// features/postulantes/hooks/usePostulantesList.ts
"use client";

//import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useState, useCallback, useMemo } from "react";
import { ORDEN_PIPELINE, Postulante } from "../types/postulante.types";
import { fetchPostulantes } from "../services/postulantesService";
import { useCargaConCache } from "@/lib/cacheCliente";


// --- Filtros dinámicos ------------------------------------------------------
// Los tres desplegables (estado, cargo, empresa) se ajustan entre sí: las opciones de
// cada uno son solo los valores que existen entre los postulantes que cumplen los OTROS
// filtros ya elegidos. Ej.: si eliges una empresa, "Cargo" solo ofrece los cargos de esa
// empresa; y si eliges un cargo, "Empresa" solo ofrece las empresas que lo tienen.
type Faceta = "estado" | "cargo" | "empresa";
type Seleccion = Record<Faceta, string>;

const FACETAS: Faceta[] = ["estado", "cargo", "empresa"];
const ORDEN_ESTADOS: string[] = ["NUEVO", ...ORDEN_PIPELINE, "DESCARTADO"];

function valorDeFaceta(p: Postulante, faceta: Faceta): string {
  if (faceta === "estado") return p.estadoActual;
  if (faceta === "cargo") return p.datosPersonales.cargoPostulado;
  return p.datosPersonales.empresaCliente;
}

function opcionesDeFaceta(postulantes: Postulante[], faceta: Faceta, seleccion: Seleccion): string[] {
  const otras = FACETAS.filter((f) => f !== faceta && seleccion[f] !== "");
  const valores = postulantes
    .filter((p) => otras.every((f) => valorDeFaceta(p, f) === seleccion[f]))
    .map((p) => valorDeFaceta(p, faceta))
    .filter((v) => v !== "");
  const unicos = Array.from(new Set(valores));
  return faceta === "estado"
    ? unicos.sort((a, b) => ORDEN_ESTADOS.indexOf(a) - ORDEN_ESTADOS.indexOf(b))
    : unicos.sort((a, b) => a.localeCompare(b));
}

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
  // La lista se recuerda entre visitas: al volver a esta pantalla se ve AL INSTANTE la de la vez anterior y
  // se actualiza sola en segundo plano (ver lib/cacheCliente.ts). Solo hay "cargando" la primera vez.
  const { datos, cargando: loading, error: errorCarga, recargar } = useCargaConCache<Postulante[]>(
    "postulantes:lista",
    fetchPostulantes
  );
  const allPostulantes = useMemo(() => datos ?? [], [datos]);
  const error = errorCarga ? "Error al cargar los postulantes" : null;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  
  // Desglosar el estado de filtros en variables individuales
  const [estado, setEstado] = useState("");
  const [cargo, setCargo] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortableField | "">("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Construir objeto filtros para el retorno
  const filtros: FiltrosLista = {
    estado,
    cargo,
    empresa,
    search,
    sortBy,
    sortOrder,
  };

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
  const seleccion: Seleccion = useMemo(() => ({ estado, cargo, empresa }), [estado, cargo, empresa]);
  const estadosOptions = useMemo(
    () => opcionesDeFaceta(allPostulantes, "estado", seleccion),
    [allPostulantes, seleccion]
  );
  const cargosOptions = useMemo(
    () => opcionesDeFaceta(allPostulantes, "cargo", seleccion),
    [allPostulantes, seleccion]
  );
  const empresasOptions = useMemo(
    () => opcionesDeFaceta(allPostulantes, "empresa", seleccion),
    [allPostulantes, seleccion]
  );

  // ============================================================
  // ACTUALIZAR FILTRO
  // ============================================================
  const actualizarFiltro = useCallback(
    <K extends keyof FiltrosLista>(key: K, value: FiltrosLista[K]) => {
      if (key === "estado" || key === "cargo" || key === "empresa") {
        // Se aplica el cambio y luego se limpian los otros desplegables cuyo valor
        // ya no existe con esta nueva combinación (para no dejar un filtro "imposible"
        // que muestre 0 resultados sin explicación).
        const siguiente: Seleccion = { ...seleccion, [key]: value as string };
        for (const otra of FACETAS.filter((f) => f !== key)) {
          if (siguiente[otra] !== "" && !opcionesDeFaceta(allPostulantes, otra, siguiente).includes(siguiente[otra])) {
            siguiente[otra] = "";
          }
        }
        setEstado(siguiente.estado);
        setCargo(siguiente.cargo);
        setEmpresa(siguiente.empresa);
      } else if (key === "search") {
        setSearch(value as string);
      } else if (key === "sortBy") {
        setSortBy(value as SortableField | "");
      } else if (key === "sortOrder") {
        setSortOrder(value as "asc" | "desc");
      }
      setPage(1);
    },
    [allPostulantes, seleccion]
  );

  // ============================================================
  // CAMBIAR ORDEN
  // ============================================================
  const cambiarOrden = useCallback((field: SortableField) => {
    setSortBy(field);
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
    setSearch("");
    setSortBy("");
    setSortOrder("asc");
    setPage(1);
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