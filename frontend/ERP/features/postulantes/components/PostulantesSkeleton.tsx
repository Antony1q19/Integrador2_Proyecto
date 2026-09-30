// features/postulantes/components/PostulantesSkeleton.tsx
// Loading mientras cargan datos
"use client";

import { Skeleton } from "@/components/shared/Skeleton";

// Imita la tabla real (8 columnas): así, al llegar los datos, nada se mueve de lugar.
export function PostulantesTableSkeleton() {
  return (
    <div aria-hidden className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex gap-6 border-b border-slate-200 bg-slate-50 px-4 py-3">
        {["w-24", "w-16", "w-20", "w-14", "w-12", "w-14", "w-14", "w-16"].map((ancho, i) => (
          <Skeleton key={i} className={`h-3 ${ancho}`} />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-6 px-4 py-3">
            <div className="flex w-48 items-center gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-4 w-6" />
            <Skeleton className="ml-auto h-7 w-14 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PostulantesFiltersSkeleton() {
  return (
    <div aria-hidden className="flex flex-wrap gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-10 w-40 rounded-lg" />
      ))}
    </div>
  );
}