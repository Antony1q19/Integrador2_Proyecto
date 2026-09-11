// features/comunicaciones/components/ChatSkeleton.tsx
"use client";

export function ChatSkeleton() {
  return (
    <div className="flex h-full animate-pulse flex-col">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 border-b border-slate-200 p-4">
        <div className="h-10 w-10 rounded-full bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="h-3 w-24 rounded bg-slate-100" />
        </div>
      </div>

      {/* Mensajes skeleton */}
      <div className="flex-1 space-y-4 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`h-12 rounded-2xl bg-slate-100 ${
                i % 2 === 0 ? "w-48" : "w-56"
              }`}
            />
          </div>
        ))}
      </div>

      {/* Input skeleton */}
      <div className="border-t border-slate-200 p-4">
        <div className="h-10 w-full rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}