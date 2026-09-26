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
  Check,
  X,
} from "lucide-react";

import { Postulante } from "../types/postulante.types";
import { SortableField } from "../hooks/usePostulantesList";
import { EstadoBadge } from "./EstadoBadge";
import { PostulantesEmptyState } from "./PostulantesEmptyState";
import { PostulantesTableSkeleton } from "./PostulantesSkeleton";
import { contarPostulaciones, postulanteTieneCuenta, prefetchPostulante } from "../services/postulantesService";

// Dirección de la bolsa de trabajo donde el postulante crea su cuenta.
const URL_ANUNCIOS = process.env.NEXT_PUBLIC_ANUNCIOS_URL ?? "http://localhost:3001";

// "Solicitar" abre el correo del usuario con un mensaje listo para invitar al postulante
// a crear su cuenta (el sistema todavía no envía correos por sí mismo).
function enlaceSolicitarCuenta(postulante: Postulante): string {
  const { nombres, email } = postulante.datosPersonales;
  const asunto = "Crea tu cuenta para seguir tu postulación";
  const cuerpo =
    `Hola ${nombres},\n\n` +
    `Para que puedas revisar el avance de tus postulaciones, te invitamos a crear tu cuenta ` +
    `en nuestra bolsa de trabajo:\n${URL_ANUNCIOS}\n\n` +
    `Usa este mismo correo (${email}) al registrarte.\n\nSaludos.`;
  return `mailto:${email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}

function ConsentimientoIcono({ aceptado }: { aceptado: boolean }) {
  return aceptado ? (
    <Check className="h-4 w-4 text-emerald-600" aria-label="Aceptado" />
  ) : (
    <X className="h-4 w-4 text-gray-300" aria-label="No aceptado" />
  );
}

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

// Ícono de ordenamiento de una columna.
function SortIcon({
  field,
  sortBy,
  sortOrder,
}: {
  field: SortableField;
  sortBy: SortableField | "";
  sortOrder: "asc" | "desc";
}) {
  if (sortBy !== field) {
    return <ChevronUp className="h-3 w-3 opacity-30" />;
  }
  return sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
}

// Cabecera de columna clickeable. Declarada fuera de PostulantesTable para
// no recrear el componente (y perder su estado) en cada render.
function SortableHeader({
  field,
  children,
  sortBy,
  sortOrder,
  onSort,
}: {
  field: SortableField;
  children: React.ReactNode;
  sortBy: SortableField | "";
  sortOrder: "asc" | "desc";
  onSort: (field: SortableField) => void;
}) {
  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition-colors select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <SortIcon field={field} sortBy={sortBy} sortOrder={sortOrder} />
      </div>
    </th>
  );
}

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
  const sortHeaderProps = { sortBy, sortOrder, onSort };

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
              <SortableHeader {...sortHeaderProps} field="datosPersonales.apellidos">
                Postulante
              </SortableHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Correo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Postulaciones
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                title="Etapa de su postulación más reciente; «Nuevo» si aún no ha postulado a nada"
              >
                Estado
              </th>
              <th
                className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider"
                title="Cuenta de acceso del postulante a la bolsa de trabajo (ANUNCIOS)"
              >
                Cuenta
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider" title="Tratamiento de datos personales (obligatorio para crear la cuenta)">
                Términos 1
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider" title="Comunicaciones comerciales (opcional)">
                Términos 2
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {postulantes.map((postulante) => {
              const nombreCompleto = `${postulante.datosPersonales.nombres} ${postulante.datosPersonales.apellidos}`;
              const isHovered = hoveredRow === postulante.id;
              const totalPostulaciones = contarPostulaciones(postulante);

              return (
                <tr
                  key={postulante.id}
                  className={`transition-colors duration-150 ${
                    isHovered ? "bg-indigo-50/50" : "hover:bg-slate-50"
                  }`}
                  onMouseEnter={() => {
                    setHoveredRow(postulante.id);
                    prefetchPostulante(postulante.id); // adelanta la ficha para que abra al instante
                  }}
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

                  {/* Correo */}
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-600">{postulante.datosPersonales.email}</p>
                  </td>

                  {/* Cantidad de anuncios a los que postuló */}
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700">
                      {totalPostulaciones} {totalPostulaciones === 1 ? "anuncio" : "anuncios"}
                    </p>
                  </td>

                  {/* Estado: etapa de su postulación más reciente, o "Nuevo" si no ha postulado a nada */}
                  <td className="px-4 py-3">
                    <EstadoBadge estado={postulante.estadoActual} />
                  </td>

                  {/* Cuenta: un check si ya tiene usuario; si no, el botón para solicitarle que la cree */}
                  <td className="px-4 py-3 text-center">
                    {postulanteTieneCuenta(postulante) ? (
                      <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="Tiene cuenta" />
                    ) : (
                      <a
                        href={enlaceSolicitarCuenta(postulante)}
                        title={`Enviar un correo a ${postulante.datosPersonales.email} para que cree su cuenta`}
                        className="inline-flex items-center rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
                      >
                        Solicitar
                      </a>
                    )}
                  </td>

                  {/* Términos 1: tratamiento de datos (obligatorio) */}
                  <td className="px-4 py-3 text-center">
                    <ConsentimientoIcono aceptado={postulante.consentimientos.tratamientoDatos} />
                  </td>

                  {/* Términos 2: comunicaciones comerciales (opcional) */}
                  <td className="px-4 py-3 text-center">
                    <ConsentimientoIcono aceptado={postulante.consentimientos.comunicacionesComerciales} />
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