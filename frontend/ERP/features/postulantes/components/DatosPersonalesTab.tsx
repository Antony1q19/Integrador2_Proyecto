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
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      {editando ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-[#1D2B53] focus:outline-none focus:ring-1 focus:ring-[#1D2B53]"
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

  const set = <K extends keyof DatosPersonales>(campo: K, valor: DatosPersonales[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const handleGuardar = async () => {
    await onGuardar(form);
    setEditando(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {editando ? (
          <div className="flex gap-2">
            <button
              onClick={() => { setForm(datos); setEditando(false); }}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="rounded-md bg-[#1D2B53] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#16224A] disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditando(true)}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Editar datos
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <Campo label="Nombres" value={form.nombres} editando={editando} onChange={(v) => set("nombres", v)} />
        <Campo label="Apellidos" value={form.apellidos} editando={editando} onChange={(v) => set("apellidos", v)} />
        <Campo label="N.º de documento" value={form.documentoNumero} editando={editando} onChange={(v) => set("documentoNumero", v)} />
        <Campo label="Correo electrónico" value={form.email} editando={editando} onChange={(v) => set("email", v)} type="email" />
        <Campo label="Teléfono" value={form.telefono} editando={editando} onChange={(v) => set("telefono", v)} />
        <Campo label="Fecha de nacimiento" value={form.fechaNacimiento} editando={editando} onChange={(v) => set("fechaNacimiento", v)} type="date" />
        <Campo label="Dirección" value={form.direccion ?? ""} editando={editando} onChange={(v) => set("direccion", v)} />
        <Campo label="Fuente de reclutamiento" value={form.fuenteReclutamiento ?? ""} editando={editando} onChange={(v) => set("fuenteReclutamiento", v)} />
      </div>

      <PerfilProfesionalResumen
        formacionAcademica={formacionAcademica}
        idiomas={idiomas}
        experiencia={experiencia}
      />
    </div>
  );
}
