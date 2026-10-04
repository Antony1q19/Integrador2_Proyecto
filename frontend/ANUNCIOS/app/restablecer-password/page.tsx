// app/restablecer-password/page.tsx
'use client';

import { useState, useEffect, useRef, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { restablecerPassword } from '@/features/auth/services/authService';

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

export default function RestablecerPasswordPage() {
  return (
    <Suspense>
      <RestablecerPasswordFormulario />
    </Suspense>
  );
}

function RestablecerPasswordFormulario() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState<string | null>(null);
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const rawToken = searchParams.get('token');
    if (rawToken) {
      setToken(rawToken);
      // Quitar el token sensible de la barra de direcciones y del historial del navegador
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [searchParams]);

  const fortaleza = calcularFortalezaPassword(nuevaPassword);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('El enlace de restablecimiento es inválido o no contiene un token.');
      return;
    }

    if (nuevaPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      passwordRef.current?.focus();
      return;
    }
    if (!/[A-Z]/.test(nuevaPassword)) {
      setError('La nueva contraseña debe incluir al menos una letra mayúscula.');
      passwordRef.current?.focus();
      return;
    }
    if (!/[a-z]/.test(nuevaPassword)) {
      setError('La nueva contraseña debe incluir al menos una letra minúscula.');
      passwordRef.current?.focus();
      return;
    }
    if (!/[0-9]/.test(nuevaPassword)) {
      setError('La nueva contraseña debe incluir al menos un número.');
      passwordRef.current?.focus();
      return;
    }
    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setEnviando(true);
    try {
      await restablecerPassword(token, nuevaPassword);
      router.push('/login?restablecido=exito');
    } catch (err) {
      const mensaje =
        err instanceof Error
          ? err.message
          : 'El enlace no es válido o venció. Solicita uno nuevo.';
      setError(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  if (!token && !searchParams.get('token')) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
          <h1 className="text-lg font-bold text-gray-900 mb-2">Enlace no válido</h1>
          <p className="text-sm text-gray-500 mb-6">
            El enlace para restablecer tu contraseña no es válido o ha expirado.
          </p>
          <Link
            href="/recuperar-password"
            className="inline-block w-full bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Solicitar un nuevo enlace
          </Link>
          <Link
            href="/login"
            className="block text-center text-sm text-primary-600 hover:text-primary-800 mt-4"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-sm p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Restablecer contraseña</h1>
        <p className="text-sm text-gray-500 mb-6">
          Ingresa tu nueva contraseña para volver a acceder a tu cuenta.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="nuevaPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Nueva contraseña
            </label>
            <input
              id="nuevaPassword"
              ref={passwordRef}
              type="password"
              required
              autoComplete="new-password"
              value={nuevaPassword}
              onChange={(e) => setNuevaPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Mínimo 8 caracteres"
            />
            {nuevaPassword && (
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
            <label htmlFor="confirmarPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar nueva contraseña
            </label>
            <input
              id="confirmarPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Repite tu nueva contraseña"
            />
          </div>

          <p className="text-xs text-gray-500">
            Debe incluir al menos 8 caracteres, una mayúscula, una minúscula y un número.
          </p>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200 space-y-2"
            >
              <p>{error}</p>
              <p>
                <Link href="/recuperar-password" className="text-primary-700 underline font-medium hover:text-primary-800">
                  ¿Deseas solicitar otro enlace de recuperación?
                </Link>
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-primary-700 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            {enviando ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </form>

        <Link
          href="/login"
          className="block text-center text-sm text-primary-600 hover:text-primary-800 mt-6"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    </main>
  );
}
