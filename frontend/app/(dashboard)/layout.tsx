"use client";

import { useState } from "react";
import Sidebar from "@/features/portada/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userRole = "ADMIN" as const;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* SIDEBAR */}

      <Sidebar
        role={userRole}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
      />

      {/* CONTENIDO PRINCIPAL */}

      <div className="lg:pl-72">

        {/* HEADER */}

        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-6 shadow-sm backdrop-blur-md">

          {/* IZQUIERDA */}

          <div className="flex items-center gap-4">

            <button
              onClick={() => setSidebarOpen(true)}
              className="
                rounded-xl
                p-2
                text-slate-600
                transition
                hover:bg-slate-100
                lg:hidden
              "
            >
              ☰
            </button>

            <div>
              <h2 className="text-lg font-bold text-slate-800">
                TalentERP
              </h2>

              <p className="text-xs text-slate-400">
                Sistema de Recursos Humanos
              </p>
            </div>

          </div>

          {/* USUARIO */}

          <div className="flex items-center gap-3">

            <div className="hidden text-right sm:block">

              <p className="text-sm font-semibold text-slate-800">
                Leonardo Morales
              </p>

              <p className="text-xs text-slate-400">
                Administrador
              </p>

            </div>

            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                bg-gradient-to-br
                from-blue-500
                to-violet-600
                text-sm
                font-bold
                text-white
                shadow-md
              "
            >
              LM
            </div>

          </div>

        </header>

        {/* CONTENIDO DE LAS PÁGINAS */}

        <main className="min-h-[calc(100vh-5rem)]">
          {children}
        </main>

      </div>

    </div>
  );
}