// app/recuperar-password/page.tsx
'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import Link from 'next/link';
import { solicitarRecuperacion } from '@/features/auth/services/authService';

const TIEMPO_ENFRIAMIENTO_SEGUNDOS = 30;

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (segundosRestantes <= 0) return;
    const temporizador = setInterval(() => {
      setSegundosRestantes((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(temporizador);
  }, [segundosRestantes]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || enviando || segundosRestantes > 0) return;

    setError(null);
    setEnviando(true);

    try {
      await solicitarRecuperacion(email.trim());
      setEnviado(true);
      setSegundosRestantes(TIEMPO_ENFRIAMIENTO_SEGUNDOS);
    } catch (err) {
      // Incluso ante error de red o límite, se notifica de forma controlada
      const mensaje = err instanceof Error ? err.message : 'No se pudo procesar la solicitud.';
      setError(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-sm p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Recuperar contraseña</h1>
        <p className="text-sm text-gray-500 mb-6">
          Ingresa tu correo y te enviaremos instrucciones para restablecer tu contraseña.
        </p>

        {enviado && (
          <div
            role="status"
            aria-live="polite"
            className="mb-5 rounded-lg bg-emerald-50 p-3.5 text-sm text-emerald-800 border border-emerald-200"
          >
            Si el correo está registrado, te enviamos un enlace de recuperación. Revisa también tu carpeta de spam.
          </div>
        )}

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              id="email"
              ref={emailInputRef}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="tu@email.com"
            />
          </div>

          <button
            type="submit"
            disabled={enviando || segundosRestantes > 0 || !email.trim()}
            className="w-full bg-primary-700 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            {enviando
              ? 'Enviando...'
              : segundosRestantes > 0
              ? `Reenviar en ${segundosRestantes}s`
              : 'Enviar instrucciones'}
          </button>
        </form>

        <Link
          href="/login"
          className="block text-center text-sm text-primary-600 hover:text-primary-800 mt-6"
        >
          ← Volver a iniciar sesión
        </Link>
      </div>
    </main>
  );
}
