// components/shared/Skeleton.tsx
//
// Piezas para dibujar "esqueletos": formas grises que imitan la pantalla mientras llegan los datos. Así la
// persona ve la estructura de inmediato (y no una pantalla en blanco o un "Cargando...") y la espera se
// siente mucho más corta. Cada esqueleto debe parecerse a lo que va a aparecer, para que no "salte" al cargar.

// Un bloque gris que "respira". Se le da el tamaño con clases de Tailwind (ej. "h-4 w-32").
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} />;
}

// Varias líneas de texto (la última más corta, como un párrafo real).
export function SkeletonTexto({ lineas = 3, className = "" }: { lineas?: number; className?: string }) {
  return (
    <div aria-hidden className={`space-y-2 ${className}`}>
      {Array.from({ length: lineas }).map((_, i) => (
        <Skeleton key={i} className={`h-3.5 ${i === lineas - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

// Una tabla con encabezados y filas. `anchos` son clases de ancho por columna (ej. ["w-40", "w-24"]).
export function SkeletonTabla({
  columnas = 5,
  filas = 5,
  anchos,
}: {
  columnas?: number;
  filas?: number;
  anchos?: string[];
}) {
  const ancho = (j: number) => anchos?.[j] ?? (j === 0 ? "w-40" : "w-24");
  return (
    <div aria-hidden className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
        {Array.from({ length: columnas }).map((_, j) => (
          <Skeleton key={j} className={`h-3 ${j === 0 ? "w-32" : "w-16"}`} />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: filas }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: columnas }).map((_, j) => (
              <Skeleton key={j} className={`h-4 ${ancho(j)}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Una tarjeta de indicador (KPI) del Dashboard.
export function SkeletonKpi() {
  return (
    <div aria-hidden className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-11 w-11 rounded-xl" />
      </div>
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

// Cabecera de página: título + subtítulo.
export function SkeletonTitulo() {
  return (
    <div aria-hidden className="space-y-2">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  );
}

// Página de detalle (empresa, anuncio): "volver", título, una tarjeta de datos y otra de lista.
export function SkeletonFicha() {
  return (
    <div aria-hidden className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-4 w-36" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Skeleton className="mb-5 h-3.5 w-48" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-44" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Skeleton className="mb-5 h-3.5 w-40" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-52" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Formulario: título y varios campos.
export function SkeletonFormulario({ campos = 6 }: { campos?: number }) {
  return (
    <div aria-hidden className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-56" />
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {Array.from({ length: campos }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Página con título y una tabla (listas de empresas, anuncios, trabajadores...).
export function SkeletonListado({ columnas = 6, filas = 5 }: { columnas?: number; filas?: number }) {
  return (
    <div aria-hidden className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <SkeletonTitulo />
          <Skeleton className="h-10 w-36" />
        </div>
        <SkeletonTabla columnas={columnas} filas={filas} />
      </div>
    </div>
  );
}
