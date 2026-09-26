import { Skeleton } from "@/components/shared/Skeleton";

// Se muestra al instante al entrar a Entrevistas, mientras llega la página.
export default function Loading() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}
