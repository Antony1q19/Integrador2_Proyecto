// features/postulantes/components/PostulantesTable.tsx
"use client";

import Link from "next/link";
import { useState, memo } from "react";
import {
  ChevronUp,
  ChevronDown,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Postulante } from "../types/postulante.types";
import { SortableField } from "../hooks/usePostulantesList";
import { PostulantesEmptyState } from "./PostulantesEmptyState";
import { PostulantesTableSkeleton } from "./PostulantesSkeleton";

interface PostulantesTableProps {
  postulantes: Postulante[];
  loading: boolean;
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;

  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  onSort: (field: SortableField) => void;

  sortBy: SortableField | "";
  sortOrder: "asc" | "desc";
}

// Mapeo de estados a colores
const getEstadoConfig = (estado: string) => {
  const configs: Record<string, { bg: string; text: string; label: string }> = {
    POSTULADO: { bg: "bg-blue-100", text: "text-blue-700", label: "Postulado" },
    EN_EVALUACION: { bg: "bg-yellow-100", text: "text-yellow-700", label: "En Evaluación" },
    ENTREVISTA: { bg: "bg-purple-100", text: "text-purple-700", label: "Entrevista" },
    PRESELECCIONADO: { bg: "bg-indigo-100", text: "text-indigo-700", label: "Preseleccionado" },
    CONTRATADO: { bg: "bg-green-100", text: "text-green-700", label: "Contratado" },
    DESCARTADO: { bg: "bg-red-100", text: "text-red-700", label: "Descartado" },
  };
  return configs[estado] || { bg: "bg-gray-100", text: "text-gray-700", label: estado };
};

export const PostulantesTable = memo(function PostulantesTable({
  postulantes,
  loading,
  totalItems,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onSort,
  sortBy,
  sortOrder,
}: PostulantesTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // Renderizar ícono de ordenamiento
const renderSortIcon = (field: SortableField) => {
  if (sortBy !== field) {
    return <ChevronUp className="h-3 w-3 opacity-30" />;
  }

  return sortOrder === "asc"
    ? <ChevronUp className="h-3 w-3" />
    : <ChevronDown className="h-3 w-3" />;
};

  // Cabecera de columna clickeable
  const SortableHeader = ({
  field,
  children,
}: {
  field: SortableField;
  children: React.ReactNode;
}) => (
  <th
    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition-colors select-none"
    onClick={() => onSort(field)}
  >
    <div className="flex items-center gap-1">
      {children}
      {renderSortIcon(field)}
    </div>
  </th>
);

  // Estado de carga
  if (loading) {
    return <PostulantesTableSkeleton />;
  }

  // Estado vacío
  if (postulantes.length === 0) {
    return <PostulantesEmptyState hasFilters={true} />;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Tabla - Scroll horizontal en móvil */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <SortableHeader field="datosPersonales.apellidos">
                Postulante
              </SortableHeader>
              <SortableHeader field="datosPersonales.cargoPostulado">
                Cargo
              </SortableHeader>
              <SortableHeader field="datosPersonales.empresaCliente">
                Empresa
              </SortableHeader>
              <SortableHeader field="estadoActual">
                Estado
              </SortableHeader>
              <SortableHeader field="fechaRegistro">
                Fecha Registro
              </SortableHeader>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {postulantes.map((postulante) => {
              const estadoConfig = getEstadoConfig(postulante.estadoActual);
              const nombreCompleto = `${postulante.datosPersonales.nombres} ${postulante.datosPersonales.apellidos}`;
              const isHovered = hoveredRow === postulante.id;

              return (
                <tr
                  key={postulante.id}
                  className={`transition-colors duration-150 ${
                    isHovered ? "bg-indigo-50/50" : "hover:bg-slate-50"
                  }`}
                  onMouseEnter={() => setHoveredRow(postulante.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {/* Postulante */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 font-semibold text-xs">
                        {postulante.datosPersonales.nombres.charAt(0)}
                        {postulante.datosPersonales.apellidos.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {nombreCompleto}
                        </p>
                        <p className="text-xs text-slate-400">
                          {postulante.datosPersonales.documentoTipo}: {postulante.datosPersonales.documentoNumero}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Cargo */}
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700">
                      {postulante.datosPersonales.cargoPostulado}
                    </p>
                  </td>

                  {/* Empresa */}
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700">
                      {postulante.datosPersonales.empresaCliente}
                    </p>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${estadoConfig.bg} ${estadoConfig.text}`}>
                      {estadoConfig.label}
                    </span>
                  </td>

                  {/* Fecha Registro */}
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-600">
                      {new Date(postulante.fechaRegistro).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </p>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/postulantes/${postulante.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Ver
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer: Paginación y totales */}
      <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Totales y selector de página */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
          <span>
            Mostrando <span className="font-medium text-slate-800">{postulantes.length}</span> de{" "}
            <span className="font-medium text-slate-800">{totalItems}</span> postulantes
          </span>
          
          <div className="flex items-center gap-2">
            <label htmlFor="pageSize" className="text-xs text-slate-500">
              Filas por página:
            </label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {[5, 10, 15, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Controles de paginación */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                if (pageNum > totalPages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`min-w-[36px] rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      page === pageNum
                        ? "bg-indigo-600 text-white font-medium"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});