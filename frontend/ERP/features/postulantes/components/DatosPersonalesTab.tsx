// features/postulantes/components/DatosPersonalesTab.tsx
"use client";

import { useState } from "react";
import { DatosPersonales, ExperienciaLaboral, FormacionAcademica, IdiomaPostulante } from "../types/postulante.types";
import { PerfilProfesionalResumen } from "./PerfilProfesionalResumen";

interface DatosPersonalesTabProps {
  datos: DatosPersonales;
  guardando: boolean;
  onGuardar: (datos: DatosPersonales) => Promise<void>;
  formacionAcademica: FormacionAcademica[];
  idiomas: IdiomaPostulante[];
  experiencia: ExperienciaLaboral[];
}

function Campo({
  label,
  value,
  editando,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  editando: boolean;
  onChange: (v: string) => void;
  type?: string;
}) {
  // id para unir la etiqueta con su campo (accesibilidad: al hacer clic en la etiqueta se enfoca el campo).
  const id = `campo-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div>
      <label htmlFor={editando ? id : undefined} className="mb-1 block text-xs font-medium text-gray-500">
        {label}
      </label>
      {editando ? (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
        />
      ) : (
        <p className="text-sm text-gray-800">{value || "—"}</p>
      )}
    </div>
  );
}

export function DatosPersonalesTab({
  datos,
  guardando,
  onGuardar,
  formacionAcademica,
  idiomas,
  experiencia,
}: DatosPersonalesTabProps) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<DatosPersonales>(datos);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  // Fuera de edición se muestra SIEMPRE lo que está guardado (`datos`, que viene del servidor), no lo
  // último que se escribió: así lo que se ve es lo que de verdad quedó en la base de datos.
  const valores = editando ? form : datos;

  const set = <K extends keyof DatosPersonales>(campo: K, valor: DatosPersonales[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const empezarEdicion = () => {
    setForm(datos); // se parte de lo guardado más reciente
    setError(null);
    setGuardado(false);
    setEditando(true);
  };

  const handleGuardar = async () => {
    setError(null);
    try {
      await onGuardar(form);
      setEditando(false);
      setGuardado(true);
    } catch (e) {
      // Antes el error se perdía: el formulario quedaba abierto sin ningún aviso.
      setError(e instanceof Error ? e.message : "No se pudieron guardar los cambios");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {editando ? (
          <div className="flex gap-2">
            <button
              onClick={() => { setForm(datos); setError(null); setEditando(false); }}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        ) : (
          <button
            onClick={empezarEdicion}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Editar datos
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {guardado && !editando && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Datos actualizados.
        </p>
      )}
      {editando && (
        <p className="text-xs text-gray-500">El N.º de documento y el correo no se pueden cambiar.</p>
      )}

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <Campo label="Nombres" value={valores.nombres} editando={editando} onChange={(v) => set("nombres", v)} />
        <Campo label="Apellidos" value={valores.apellidos} editando={editando} onChange={(v) => set("apellidos", v)} />
        {/* El documento y el correo identifican al postulante: el backend no permite cambiarlos. */}
        <Campo label="N.º de documento" value={valores.documentoNumero} editando={false} onChange={() => {}} />
        <Campo label="Correo electrónico" value={valores.email} editando={false} onChange={() => {}} />
        <Campo label="Teléfono" value={valores.telefono} editando={editando} onChange={(v) => set("telefono", v)} type="tel" />
        <Campo label="Fecha de nacimiento" value={valores.fechaNacimiento} editando={editando} onChange={(v) => set("fechaNacimiento", v)} type="date" />
        <Campo label="Dirección" value={valores.direccion ?? ""} editando={editando} onChange={(v) => set("direccion", v)} />
        <Campo label="Fuente de reclutamiento" value={valores.fuenteReclutamiento ?? ""} editando={editando} onChange={(v) => set("fuenteReclutamiento", v)} />
      </div>

      <PerfilProfesionalResumen
        formacionAcademica={formacionAcademica}
        idiomas={idiomas}
        experiencia={experiencia}
      />
    </div>
  );
}
