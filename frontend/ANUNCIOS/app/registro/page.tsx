// app/registro/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { registrarCuenta } from '@/features/perfil/services/perfilService';
import { TipoDocumento } from '@/features/perfil/types';

const inputClass =
  'w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

interface FormState {
  nombres: string;
  apellidos: string;
  documentoTipo: TipoDocumento;
  documentoNumero: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  password: string;
  confirmarPassword: string;
  aceptaTratamientoDatos: boolean;
  aceptaComunicaciones: boolean;
}

const FORM_INICIAL: FormState = {
  nombres: '',
  apellidos: '',
  documentoTipo: 'DNI',
  documentoNumero: '',
  email: '',
  telefono: '',
  fechaNacimiento: '',
  password: '',
  confirmarPassword: '',
  aceptaTratamientoDatos: false,
  aceptaComunicaciones: false,
};

export default function RegistroPage() {
  const router = useRouter();
  const { registrarSesion } = useAuth();

  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const set = <K extends keyof FormState>(campo: K, valor: FormState[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (
      !form.nombres ||
      !form.apellidos ||
      !form.documentoNumero ||
      !form.email ||
      !form.telefono ||
      !form.fechaNacimiento
    ) {
      setError('Completa todos los datos personales.');
      return;
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (form.password !== form.confirmarPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!form.aceptaTratamientoDatos) {
      setError('Debes aceptar el tratamiento de tus datos personales para crear tu cuenta.');
      return;
    }

    setEnviando(true);
    try {
      const perfil = await registrarCuenta({
        datosPersonales: {
          nombres: form.nombres,
          apellidos: form.apellidos,
          documentoTipo: form.documentoTipo,
          documentoNumero: form.documentoNumero,
          email: form.email,
          telefono: form.telefono,
          fechaNacimiento: form.fechaNacimiento,
        },
        consentimientos: {
          tratamientoDatos: form.aceptaTratamientoDatos,
          comunicacionesComerciales: form.aceptaComunicaciones,
        },
      });

      registrarSesion({
        id: perfil.id,
        nombre: `${form.nombres} ${form.apellidos}`,
        email: form.email,
      });

      router.push('/perfil');
    } catch {
      setError('No pudimos crear tu cuenta. Intenta nuevamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-xl shadow-sm p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Crear cuenta</h1>
        <p className="text-sm text-gray-500 mb-6">
          Regístrate para postular a empleos y hacer seguimiento a tus postulaciones.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Datos personales */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="nombres" className={labelClass}>
                Nombres
              </label>
              <input
                id="nombres"
                required
                value={form.nombres}
                onChange={(e) => set('nombres', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="apellidos" className={labelClass}>
                Apellidos
              </label>
              <input
                id="apellidos"
                required
                value={form.apellidos}
                onChange={(e) => set('apellidos', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="documentoTipo" className={labelClass}>
                Tipo de documento
              </label>
              <select
                id="documentoTipo"
                value={form.documentoTipo}
                onChange={(e) => set('documentoTipo', e.target.value as TipoDocumento)}
                className={inputClass}
              >
                <option value="DNI">DNI</option>
                <option value="CE">Carné de extranjería</option>
                <option value="PASAPORTE">Pasaporte</option>
              </select>
            </div>
            <div>
              <label htmlFor="documentoNumero" className={labelClass}>
                N.º de documento
              </label>
              <input
                id="documentoNumero"
                required
                value={form.documentoNumero}
                onChange={(e) => set('documentoNumero', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className={inputClass}
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label htmlFor="telefono" className={labelClass}>
                Teléfono
              </label>
              <input
                id="telefono"
                required
                value={form.telefono}
                onChange={(e) => set('telefono', e.target.value)}
                className={inputClass}
                placeholder="+51 987 654 321"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="fechaNacimiento" className={labelClass}>
                Fecha de nacimiento
              </label>
              <input
                id="fechaNacimiento"
                type="date"
                required
                value={form.fechaNacimiento}
                onChange={(e) => set('fechaNacimiento', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="password" className={labelClass}>
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                className={inputClass}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label htmlFor="confirmarPassword" className={labelClass}>
                Confirmar contraseña
              </label>
              <input
                id="confirmarPassword"
                type="password"
                required
                value={form.confirmarPassword}
                onChange={(e) => set('confirmarPassword', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Consentimientos de datos personales */}
          <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/60 p-4">
            <label className="flex items-start gap-2.5 text-sm text-gray-700">
              <input
                type="checkbox"
                required
                checked={form.aceptaTratamientoDatos}
                onChange={(e) => set('aceptaTratamientoDatos', e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-purple-700 focus:ring-purple-500"
              />
              <span>
                He leído y acepto la{' '}
                <Link href="/legal/privacidad" target="_blank" className="text-purple-700 underline hover:text-purple-900">
                  Política de Privacidad y los Términos y Condiciones
                </Link>
                , y autorizo el tratamiento de mis datos personales para fines del proceso de
                selección.{' '}
                <span className="text-gray-400">(Obligatorio)</span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.aceptaComunicaciones}
                onChange={(e) => set('aceptaComunicaciones', e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-purple-700 focus:ring-purple-500"
              />
              <span>
                Acepto recibir correos, llamadas y mensajes sobre nuevas ofertas laborales.{' '}
                <span className="text-gray-400">(Opcional)</span>
              </span>
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-purple-800 hover:bg-purple-900 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-md transition-colors"
          >
            {enviando ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-purple-700 hover:text-purple-900 font-medium">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
