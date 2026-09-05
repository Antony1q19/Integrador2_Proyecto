// features/perfil/components/DatosPersonalesSection.tsx
'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { DatosPersonalesPerfil, TipoDocumento } from '../types';
import { SectionCard } from './SectionCard';

interface DatosPersonalesSectionProps {
  datos: DatosPersonalesPerfil;
  guardando: boolean;
  onGuardar: (datos: DatosPersonalesPerfil) => Promise<void>;
}

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 transition-colors duration-150 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30';

const labelClass = 'mb-1 block text-xs font-medium text-gray-500';

const CAMPO: { label: string; valor: (d: DatosPersonalesPerfil) => string }[] = [
  { label: 'Nombres', valor: (d) => d.nombres },
  { label: 'Apellidos', valor: (d) => d.apellidos },
  { label: 'N.º de documento', valor: (d) => `${d.documentoTipo} ${d.documentoNumero}` },
  { label: 'Correo electrónico', valor: (d) => d.email },
  { label: 'Teléfono', valor: (d) => d.telefono },
  { label: 'Fecha de nacimiento', valor: (d) => d.fechaNacimiento },
  { label: 'Dirección', valor: (d) => d.direccion || '—' },
];

export function DatosPersonalesSection({
  datos,
  guardando,
  onGuardar,
}: DatosPersonalesSectionProps) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(datos);

  const handleEditar = () => {
    setForm(datos);
    setEditando(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGuardar(form);
    setEditando(false);
  };

  return (
    <SectionCard
      titulo="Datos personales"
      accion={
        !editando && (
          <button
            onClick={handleEditar}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-purple-700 transition-colors duration-150 hover:bg-purple-50 active:scale-[0.97]"
          >
            <Pencil size={13} /> Editar
          </button>
        )
      }
    >
      {editando ? (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Nombres</label>
            <input
              required
              value={form.nombres}
              onChange={(e) => setForm({ ...form, nombres: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Apellidos</label>
            <input
              required
              value={form.apellidos}
              onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Tipo de documento</label>
            <select
              value={form.documentoTipo}
              onChange={(e) =>
                setForm({ ...form, documentoTipo: e.target.value as TipoDocumento })
              }
              className={inputClass}
            >
              <option value="DNI">DNI</option>
              <option value="CE">Carné de extranjería</option>
              <option value="PASAPORTE">Pasaporte</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>N.º de documento</label>
            <input
              required
              value={form.documentoNumero}
              onChange={(e) => setForm({ ...form, documentoNumero: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Correo electrónico</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Teléfono</label>
            <input
              required
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Fecha de nacimiento</label>
            <input
              required
              type="date"
              value={form.fechaNacimiento}
              onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Dirección</label>
            <input
              value={form.direccion ?? ''}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={guardando}
              className="rounded-md bg-purple-800 px-4 py-2 text-sm font-medium text-white transition-[background-color,transform] duration-150 ease-out hover:bg-purple-900 active:scale-[0.97] disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors duration-150 hover:bg-gray-50 active:scale-[0.97]"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CAMPO.map(({ label, valor }) => (
            <div key={label}>
              <dt className="text-xs text-gray-500">{label}</dt>
              <dd className="mt-0.5 text-sm text-gray-900">{valor(datos)}</dd>
            </div>
          ))}
        </dl>
      )}
    </SectionCard>
  );
}
