// app/registro/page.tsx
'use client';

import { useState, FormEvent, Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/features/auth/hooks/useAuth';

const inputClass =
  'w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

type TipoDocumento = 'DNI' | 'CE' | 'PASAPORTE';

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

function calcularFortalezaPassword(pwd: string): { nivel: number; texto: string; color: string } {
  if (!pwd) return { nivel: 0, texto: '', color: 'bg-gray-200' };

  let puntos = 0;
  if (pwd.length >= 8) puntos += 1;
  if (pwd.length >= 12) puntos += 1;
  if (/[A-Z]/.test(pwd)) puntos += 1;
  if (/[a-z]/.test(pwd)) puntos += 1;
  if (/[0-9]/.test(pwd)) puntos += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) puntos += 1;

  if (puntos < 3) return { nivel: 1, texto: 'Débil', color: 'bg-red-500' };
  if (puntos < 5) return { nivel: 2, texto: 'Media', color: 'bg-amber-500' };
  return { nivel: 3, texto: 'Fuerte', color: 'bg-emerald-500' };
}

export default function RegistroPage() {
  return (
    <Suspense>
      <RegistroFormulario />
    </Suspense>
  );
}

function RegistroFormulario() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');
  const siguienteParam = searchParams.get('siguiente');

  const { registrar } = useAuth();

  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const nombresRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Precargar correo si viene en la URL (?email=...) desde la invitación de RRHH
  useEffect(() => {
    if (emailParam) {
      setForm((prev) => ({ ...prev, email: emailParam }));
    }
  }, [emailParam]);

  const set = <K extends keyof FormState>(campo: K, valor: FormState[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const fortaleza = calcularFortalezaPassword(form.password);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // 1. Validaciones básicas de campos obligatorios
    if (
      !form.nombres.trim() ||
      !form.apellidos.trim() ||
      !form.documentoNumero.trim() ||
      !form.email.trim()
    ) {
      setError('Completa tus datos personales requeridos (Nombres, Apellidos, Documento y Correo).');
      nombresRef.current?.focus();
      return;
    }

    // 2. Política de contraseña (mínimo 8, mayúscula, minúscula, número)
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      passwordRef.current?.focus();
      return;
    }
    if (!/[A-Z]/.test(form.password)) {
      setError('La contraseña debe incluir al menos una letra mayúscula.');
      passwordRef.current?.focus();
      return;
    }
    if (!/[a-z]/.test(form.password)) {
      setError('La contraseña debe incluir al menos una letra minúscula.');
      passwordRef.current?.focus();
      return;
    }
    if (!/[0-9]/.test(form.password)) {
      setError('La contraseña debe incluir al menos un número.');
      passwordRef.current?.focus();
      return;
    }
    if (form.password !== form.confirmarPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    // 3. Aceptación obligatoria de términos
    if (!form.aceptaTratamientoDatos) {
      setError('Debes aceptar la Política de Privacidad y el Tratamiento de Datos Personales para crear tu cuenta.');
      return;
    }

    setEnviando(true);
    try {
      await registrar({
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        documentoTipo: form.documentoTipo,
        documentoNumero: form.documentoNumero.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim() || undefined,
        fechaNacimiento: form.fechaNacimiento || undefined,
        password: form.password,
        aceptaTratamientoDatos: form.aceptaTratamientoDatos,
        aceptaComunicaciones: form.aceptaComunicaciones,
      });

      const destino = siguienteParam && siguienteParam.startsWith('/') ? siguienteParam : '/perfil';
      router.push(destino);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'No pudimos crear tu cuenta. Intenta nuevamente.';
      setError(mensaje);
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

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Datos personales */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="nombres" className={labelClass}>
                Nombres <span className="text-red-500">*</span>
              </label>
              <input
                id="nombres"
                ref={nombresRef}
                required
                value={form.nombres}
                onChange={(e) => set('nombres', e.target.value)}
                className={inputClass}
                placeholder="Juan"
              />
            </div>
            <div>
              <label htmlFor="apellidos" className={labelClass}>
                Apellidos <span className="text-red-500">*</span>
              </label>
              <input
                id="apellidos"
                required
                value={form.apellidos}
                onChange={(e) => set('apellidos', e.target.value)}
                className={inputClass}
                placeholder="Pérez"
              />
            </div>
            <div>
              <label htmlFor="documentoTipo" className={labelClass}>
                Tipo de documento <span className="text-red-500">*</span>
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
                N.º de documento <span className="text-red-500">*</span>
              </label>
              <input
                id="documentoNumero"
                required
                value={form.documentoNumero}
                onChange={(e) => set('documentoNumero', e.target.value)}
                className={inputClass}
                placeholder="87654321"
              />
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>
                Correo electrónico <span className="text-red-500">*</span>
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
                Teléfono <span className="text-gray-400 font-normal">(Opcional)</span>
              </label>
              <input
                id="telefono"
                value={form.telefono}
                onChange={(e) => set('telefono', e.target.value)}
                className={inputClass}
                placeholder="+51 987 654 321"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="fechaNacimiento" className={labelClass}>
                Fecha de nacimiento <span className="text-gray-400 font-normal">(Opcional)</span>
              </label>
              <input
                id="fechaNacimiento"
                type="date"
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
                Contraseña <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                ref={passwordRef}
                type="password"
                required
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                className={inputClass}
                placeholder="Mínimo 8 caracteres"
              />
              {form.password && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex h-1.5 flex-1 gap-1">
                    <div className={`h-full flex-1 rounded-full ${fortaleza.nivel >= 1 ? fortaleza.color : 'bg-gray-200'}`} />
                    <div className={`h-full flex-1 rounded-full ${fortaleza.nivel >= 2 ? fortaleza.color : 'bg-gray-200'}`} />
                    <div className={`h-full flex-1 rounded-full ${fortaleza.nivel >= 3 ? fortaleza.color : 'bg-gray-200'}`} />
                  </div>
                  <span className="text-xs text-gray-500">{fortaleza.texto}</span>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="confirmarPassword" className={labelClass}>
                Confirmar contraseña <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmarPassword"
                type="password"
                required
                value={form.confirmarPassword}
                onChange={(e) => set('confirmarPassword', e.target.value)}
                className={inputClass}
                placeholder="Repite tu contraseña"
              />
            </div>
          </div>

          <p className="text-xs text-gray-500">
            La contraseña debe tener al menos 8 caracteres, incluyendo una letra mayúscula, una minúscula y un número.
          </p>

          {/* Consentimientos de datos personales */}
          <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/60 p-4">
            <label className="flex items-start gap-2.5 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={form.aceptaTratamientoDatos}
                onChange={(e) => set('aceptaTratamientoDatos', e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span>
                He leído y acepto la{' '}
                <Link
                  href="/legal/privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 underline hover:text-primary-800"
                >
                  Política de Privacidad y Términos y Condiciones
                </Link>
                , y autorizo el tratamiento de mis datos personales para fines de los procesos de selección.{' '}
                <span className="text-primary-700 font-semibold">(Obligatorio)</span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.aceptaComunicaciones}
                onChange={(e) => set('aceptaComunicaciones', e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span>
                Acepto recibir comunicaciones sobre nuevas convocatorias y ofertas laborales.{' '}
                <span className="text-gray-400">(Opcional)</span>
              </span>
            </label>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando || !form.aceptaTratamientoDatos}
            className="w-full bg-primary-700 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            {enviando ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-primary-600 hover:text-primary-800 font-medium">
            Inicia sesión
          </Link>
        </p>

        <Link
          href="/"
          className="block text-center text-sm text-primary-600 hover:text-primary-800 mt-4"
        >
          Volver al listado de ofertas
        </Link>
      </div>
    </main>
  );
}
