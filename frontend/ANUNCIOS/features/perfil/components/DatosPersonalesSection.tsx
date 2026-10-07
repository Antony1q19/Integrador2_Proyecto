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
  'w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 transition-colors duration-150 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30';

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
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary-600 transition-colors duration-150 hover:bg-primary-50 active:scale-[0.97]"
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
            {/* El documento no se cambia desde el perfil (el backend lo rechaza): identifica a la
                persona ante la consultora. Si está mal, se corrige desde el ERP. */}
            <select
              value={form.documentoTipo}
              disabled
              title="El documento no se puede cambiar desde tu perfil"
              onChange={(e) =>
                setForm({ ...form, documentoTipo: e.target.value as TipoDocumento })
              }
              className={`${inputClass} cursor-not-allowed opacity-70`}
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
              readOnly
              title="El documento no se puede cambiar desde tu perfil"
              value={form.documentoNumero}
              className={`${inputClass} cursor-not-allowed opacity-70`}
            />
            <p className="mt-1 text-xs text-slate-500">
              Si tu documento tiene un error, comunícate con la consultora.
            </p>
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
              className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-[background-color,transform] duration-150 ease-out hover:bg-primary-800 active:scale-[0.97] disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors duration-150 hover:bg-gray-50 active:scale-[0.97]"
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
