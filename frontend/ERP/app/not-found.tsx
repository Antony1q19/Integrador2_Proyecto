// app/not-found.tsx
//
// Página 404 de todo el ERP (Next.js la muestra automáticamente cuando
// ninguna ruta matchea). Mismos colores/gradiente que login y el sidebar
// (blue-600 -> violet-600), en vez del genérico gris de antes.
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-6">
      {/* Manchas decorativas de fondo, mismo recurso que el panel del login
          (features/login/componentes/loginform.tsx) y el sidebar. */}
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-violet-600/15 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 top-1/4 h-3 w-3 rounded-full bg-violet-400" />
      <div className="pointer-events-none absolute right-1/4 top-1/3 h-2 w-2 rounded-full bg-blue-400" />
      <div className="pointer-events-none absolute bottom-1/3 left-1/4 h-2.5 w-2.5 rounded-full bg-violet-300" />
      <div className="pointer-events-none absolute right-1/3 top-16 h-8 w-8 rounded-full border-2 border-violet-200" />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Logo, igual al de login/sidebar, para que se sienta parte del ERP */}
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg shadow-violet-900/20">
          <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>

        <h1 className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-[7rem] font-black leading-none tracking-tight text-transparent sm:text-[9rem]">
          404
        </h1>

        <h2 className="mt-4 text-2xl font-bold text-slate-800 sm:text-3xl">Página no encontrada</h2>
        <p className="mt-3 max-w-md text-sm text-slate-500">
          El enlace que seguiste está roto, o la página que buscas ya no existe.
        </p>

        <Link
          href="/"
          className="mt-8 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet-900/20 transition-transform hover:scale-105 hover:from-blue-700 hover:to-violet-700"
        >
          Volver al menú principal
        </Link>
      </div>
    </main>
  );
}
