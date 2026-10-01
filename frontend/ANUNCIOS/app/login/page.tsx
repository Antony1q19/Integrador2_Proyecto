// app/login/page.tsx
'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/features/auth/hooks/useAuth';

// A dónde volver después de entrar (?siguiente=/anuncios/4). Solo se aceptan rutas INTERNAS
// ("/algo", no "//otro-sitio.com" ni "https://..."), para que nadie use este enlace para
// mandar a la gente a una página falsa después de iniciar sesión.
function destinoSeguro(siguiente: string | null): string {
  if (siguiente && siguiente.startsWith('/') && !siguiente.startsWith('//') && !siguiente.startsWith('/\\')) {
    return siguiente;
  }
  return '/';
}

// useSearchParams necesita un <Suspense> alrededor en Next.js.
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
  const { iniciarSesion, cargando } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Completa tu email y contraseña.');
      return;
    }

    try {
      await iniciarSesion(email, password);
      router.push(destino);
    } catch {
      setError('No pudimos iniciar sesión. Verifica tus datos.');
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-sm p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Iniciar sesión</h1>
        <p className="text-sm text-gray-500 mb-6">
          Accede para postular a empleos y ver tu historial.
        </p>

        {vieneAPostular && (
          <p role="status" className="mb-5 rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-800">
            Inicia sesión para postular a esta oferta. Te devolveremos al anuncio.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
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
              <Link href="/recuperar-password" className="text-xs text-primary-600 hover:text-primary-800">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-primary-700 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
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
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}