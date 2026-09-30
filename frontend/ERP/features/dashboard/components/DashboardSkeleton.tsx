// features/dashboard/components/DashboardSkeleton.tsx
//
// Esqueleto del Dashboard: imita la barra de filtros, las 8 tarjetas, las gráficas y las tablas, con las mismas
// medidas que la pantalla real, para que al llegar los datos nada se mueva de lugar.
import { Skeleton, SkeletonKpi, SkeletonTabla, SkeletonTitulo } from "@/components/shared/Skeleton";

export function TarjetasDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonKpi key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonKpi key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
          <Skeleton className="mb-2 h-5 w-56" />
          <Skeleton className="mb-6 h-3 w-80 max-w-full" />
          <div className="flex h-[250px] items-end gap-2">
            {[40, 65, 30, 80, 55, 90, 45, 70, 35, 60, 85, 50, 75, 40, 65].map((alto, i) => (
              <div key={i} className="flex flex-1 items-end self-stretch">
                <div className="w-full animate-pulse rounded-md bg-slate-200/80" style={{ height: `${alto}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <Skeleton className="mb-2 h-5 w-40" />
          <Skeleton className="mb-6 h-3 w-52" />
          <div className="space-y-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-2.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <Skeleton className="mb-4 h-5 w-48" />
        <SkeletonTabla columnas={7} filas={3} anchos={["w-48", "w-12", "w-12", "w-16", "w-12", "w-12", "w-16"]} />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <SkeletonTitulo />
      <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-36" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-16 rounded-full" />
          ))}
        </div>
      </div>
      <TarjetasDashboardSkeleton />
    </div>
  );
}
