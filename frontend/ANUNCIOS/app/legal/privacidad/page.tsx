// app/legal/privacidad/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/hooks/useAuth';

const VERSION_VIGENTE = '2026-01';
const FECHA_VIGENCIA = 'Enero de 2026';

export default function PrivacidadPage() {
  const { usuario, estaAutenticado, aceptarTerminos } = useAuth();
  const [aceptando, setAceptando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);

  const requiereAceptar = estaAutenticado && Boolean(usuario?.requiereAceptarTerminos);

  async function handleAceptar() {
    setAceptando(true);
    try {
      await aceptarTerminos(VERSION_VIGENTE);
      setMensajeExito(true);
    } catch {
      // Ignorar o mostrar feedback
    } finally {
      setAceptando(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-8">
        {requiereAceptar && !mensajeExito && (
          <div
            role="alert"
            className="mb-6 rounded-lg bg-amber-50 p-4 border border-amber-200 text-amber-900"
          >
            <h2 className="text-sm font-semibold mb-1">Nueva versión de Términos y Condiciones</h2>
            <p className="text-xs mb-3 text-amber-800 leading-relaxed">
              Hemos actualizado nuestra Política de Privacidad y Términos y Condiciones (Versión {VERSION_VIGENTE}).
              Para seguir postulando y utilizando tu cuenta, debes aceptar los nuevos términos.
            </p>
            <button
              type="button"
              disabled={aceptando}
              onClick={handleAceptar}
              className="bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {aceptando ? 'Aceptando...' : 'He leído y acepto los términos vigentes'}
            </button>
          </div>
        )}

        {mensajeExito && (
          <div
            role="status"
            className="mb-6 rounded-lg bg-emerald-50 p-3.5 border border-emerald-200 text-xs text-emerald-800 font-medium"
          >
            ¡Gracias! Has aceptado la versión {VERSION_VIGENTE} de los Términos y Condiciones.
          </div>
        )}

        <h1 className="text-xl font-bold text-gray-900">
          Política de Privacidad y Términos y Condiciones
        </h1>
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
          <span>Versión vigente: <strong>{VERSION_VIGENTE}</strong></span>
          <span>•</span>
          <span>Última actualización: {FECHA_VIGENCIA}</span>
        </div>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="mb-1 text-sm font-semibold text-gray-900">1. Responsable del tratamiento</h2>
            <p>
              Bolsa de Trabajo (en adelante, &quot;la Empresa&quot;) es responsable del tratamiento de los
              datos personales que nos proporcionas al crear tu cuenta y postular a nuestras
              ofertas de empleo, conforme a la Ley N.º 29733, Ley de Protección de Datos
              Personales de la República del Perú, y su reglamento aprobado por D.S. N.º 003-2013-JUS.
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-sm font-semibold text-gray-900">2. Finalidad del tratamiento</h2>
            <p>
              Usamos tus datos personales (nombre, documento de identidad, contacto, fecha de nacimiento,
              formación académica, experiencia laboral y CV adjunto) exclusivamente para:
              (a) gestionar tu cuenta y verificar tu identidad, (b) evaluar tu perfil frente a los
              requisitos de las vacantes a las que postules en las empresas clientes, y
              (c) contactarte durante las distintas fases de los procesos de selección.
              No compartimos tus datos con terceros ajenos al proceso de selección sin tu consentimiento expreso.
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-sm font-semibold text-gray-900">
              3. Comunicaciones comerciales (opcional)
            </h2>
            <p>
              Si autorizas de forma independiente esta opción, podremos enviarte notificaciones sobre
              nuevas ofertas laborales acordes a tu perfil. Esta autorización es completamente opcional,
              no condiciona la creación de tu cuenta ni tu postulación a convocatorias de empleo,
              y puedes revocarla cuando quieras.
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-sm font-semibold text-gray-900">4. Derechos ARCO</h2>
            <p>
              Conforme a la Ley N.º 29733, puedes ejercer tus derechos de Acceso, Rectificación, Cancelación
              y Oposición (derechos ARCO), así como revocar tu consentimiento en cualquier momento.
              La revocación no afecta la licitud del tratamiento efectuado con anterioridad a la misma.
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-sm font-semibold text-gray-900">5. Conservación y seguridad de los datos</h2>
            <p>
              Conservamos tus datos mientras tu cuenta de postulante esté activa y durante el plazo necesario
              para atender obligaciones contractuales o legales. Implementamos medidas técnicas y organizativas
              de seguridad para salvaguardar la confidencialidad de tus datos.
            </p>
          </section>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-4">
          <Link
            href="/"
            className="text-sm font-medium text-primary-600 hover:text-primary-800"
          >
            ← Volver a los empleos
          </Link>

          {!estaAutenticado && (
            <Link
              href="/registro"
              className="text-sm font-medium text-primary-600 hover:text-primary-800"
            >
              Crear cuenta →
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
