// app/recuperar-password/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setEnviando(true);
    // TODO: reemplazar por el envío real de correo cuando exista backend.
    await new Promise((resolve) => setTimeout(resolve, 600));
    setEnviando(false);
    setEnviado(true);
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-sm p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Recuperar contraseña</h1>
        <p className="text-sm text-gray-500 mb-6">
          Ingresa tu correo y te enviaremos instrucciones para restablecerla.
        </p>

        {enviado ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
            Si el correo <span className="font-medium">{email}</span> está registrado, te
            enviaremos instrucciones en unos minutos.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="tu@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-purple-800 hover:bg-purple-900 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-md transition-colors"
            >
              {enviando ? 'Enviando...' : 'Enviar instrucciones'}
            </button>
          </form>
        )}

        <Link
          href="/login"
          className="block text-center text-sm text-purple-700 hover:text-purple-900 mt-6"
        >
          ← Volver a iniciar sesión
        </Link>
      </div>
    </main>
  );
}
