// app/legal/privacidad/page.tsx
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidad | Bolsa de Trabajo',
  description: 'Política de tratamiento de datos personales y términos y condiciones.',
};

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-8">
        <h1 className="text-xl font-bold text-gray-900">
          Política de Privacidad y Términos y Condiciones
        </h1>
        <p className="mt-1 text-sm text-gray-400">Última actualización: enero de 2026</p>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="mb-1 text-sm font-semibold text-gray-900">1. Responsable del tratamiento</h2>
            <p>
              Bolsa de Trabajo (en adelante, &quot;la Empresa&quot;) es responsable del tratamiento de los
              datos personales que nos proporcionas al crear tu cuenta y postular a nuestras
              ofertas de empleo, conforme a la Ley N.º 29733, Ley de Protección de Datos
              Personales, y su reglamento.
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-sm font-semibold text-gray-900">2. Finalidad del tratamiento</h2>
            <p>
              Usamos tus datos personales (nombre, documento de identidad, contacto, formación
              académica, experiencia laboral y CV) exclusivamente para: (a) gestionar tu cuenta y
              tu postulación a procesos de selección, (b) evaluar tu perfil frente a los
              requisitos de las vacantes a las que postules, y (c) contactarte durante dichos
              procesos. No compartimos tus datos con terceros ajenos al proceso de selección sin
              tu autorización expresa.
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-sm font-semibold text-gray-900">
              3. Comunicaciones comerciales (opcional)
            </h2>
            <p>
              Si lo autorizas de forma independiente, también podremos enviarte correos, llamadas
              o mensajes sobre nuevas ofertas laborales que podrían interesarte. Esta autorización
              es completamente opcional, no condiciona la creación de tu cuenta ni tu
              participación en procesos de selección, y puedes revocarla cuando quieras desde tu
              perfil.
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-sm font-semibold text-gray-900">4. Tus derechos (derechos ARCO)</h2>
            <p>
              Puedes acceder, rectificar, cancelar tus datos u oponerte a su tratamiento (derechos
              ARCO), así como revocar tu consentimiento en cualquier momento, escribiendo desde tu
              perfil o al correo de contacto de la Empresa. La revocación no afecta la licitud del
              tratamiento previo a la misma.
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-sm font-semibold text-gray-900">5. Conservación de los datos</h2>
            <p>
              Conservamos tus datos mientras tu cuenta esté activa y durante el tiempo necesario
              para cumplir con las finalidades descritas, salvo que solicites su cancelación
              antes.
            </p>
          </section>
        </div>

        <Link
          href="/registro"
          className="mt-8 inline-block text-sm font-medium text-purple-700 hover:text-purple-900"
        >
          ← Volver a crear cuenta
        </Link>
      </div>
    </main>
  );
}
