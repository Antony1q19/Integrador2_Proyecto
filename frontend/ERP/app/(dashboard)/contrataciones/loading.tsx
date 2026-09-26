import { Skeleton } from "@/components/shared/Skeleton";

// Se muestra al instante al entrar a Contrataciones, mientras llega la página.
export default function Loading() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}
