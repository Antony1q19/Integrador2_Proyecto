// features/postulantes/components/PostulantesSkeleton.tsx
"use client";

export function PostulantesTableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-8 w-48 rounded bg-slate-200"></div>
        <div className="h-8 w-32 rounded bg-slate-200"></div>
      </div>
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-4 w-20 rounded bg-slate-200"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="border-t border-slate-100">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 w-full rounded bg-slate-100"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PostulantesFiltersSkeleton() {
  return (
    <div className="animate-pulse flex flex-wrap gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-10 w-40 rounded-lg bg-slate-200"></div>
      ))}
    </div>
  );
}