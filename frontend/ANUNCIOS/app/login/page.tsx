// app/login/page.tsx
'use client';

import { useState, FormEvent, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/features/auth/hooks/useAuth';

function destinoSeguro(siguiente: string | null): string {
  if (
    siguiente &&
    siguiente.startsWith('/') &&
    !siguiente.startsWith('//') &&
    !siguiente.startsWith('/\\')
  ) {
    return siguiente;
  }
  return '/perfil';
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginFormulario />
    </Suspense>
  );
}

function LoginFormulario() {
  const router = useRouter();
  const parametros = useSearchParams();
  const destino = destinoSeguro(parametros.get('siguiente'));
  const vieneAPostular = parametros.get('motivo') === 'postular';
  const restablecidoExito = parametros.get('restablecido') === 'exito';

  const { iniciarSesion, cargando } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico.');
      emailRef.current?.focus();
      return;
    }

    if (!password) {
      setError('Por favor ingresa tu contraseña.');
      passwordRef.current?.focus();
      return;
    }

    try {
      await iniciarSesion(email.trim(), password);
      router.push(destino);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'No pudimos iniciar sesión. Verifica tus datos.';
      setError(mensaje);
      passwordRef.current?.focus();
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-sm p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Iniciar sesión</h1>
        <p className="text-sm text-gray-500 mb-6">
          Accede para postular a empleos y revisar tu estado.
        </p>

        {vieneAPostular && (
          <p role="status" className="mb-5 rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-800">
            Inicia sesión para postular a esta oferta. Te devolveremos al anuncio automáticamente.
          </p>
        )}

        {restablecidoExito && (
          <p role="status" className="mb-5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 border border-emerald-200">
            Tu contraseña ha sido actualizada. Ya puedes iniciar sesión con tu nueva clave.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              id="email"
              ref={emailRef}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <Link href="/recuperar-password" className="text-xs text-primary-600 hover:text-primary-800 font-medium">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              id="password"
              ref={passwordRef}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="••••••••"
            />
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
            disabled={cargando}
            className="w-full bg-primary-700 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿No tienes cuenta?{' '}
          <Link href="/registro" className="text-primary-600 hover:text-primary-800 font-medium">
            Crear cuenta
          </Link>
        </p>

        <Link
          href="/"
          className="block text-center text-sm text-primary-600 hover:text-primary-800 mt-4"
        >
          Volver al listado de empleos
        </Link>
      </div>
    </main>
  );
}