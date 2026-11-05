import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-gray-100">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold text-3xl">
          404
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Página o vacante no encontrada
          </h1>
          <p className="text-sm text-gray-600">
            Lo sentimos, el enlace al que intentas acceder no existe, ha expirado o la convocatoria de empleo ya ha concluido.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex justify-center items-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm"
          >
            Explorar ofertas de empleo
          </Link>
          <Link
            href="/perfil"
            className="inline-flex justify-center items-center px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
          >
            Ir a mi perfil
          </Link>
        </div>
      </div>
    </main>
  );
}
