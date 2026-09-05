"use client";

import { useState, useSyncExternalStore } from "react";
import Sidebar from "@/features/portada/components/sidebar";
import { Role } from "@/features/portada/types/menu"; // Asegúrate de tener este import

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null;
  return null;
}

// Las cookies de sesión no emiten eventos de cambio dentro de esta pantalla, así que
// no hay nada a lo que suscribirse; useSyncExternalStore se usa aquí solo para leer el
// valor real del navegador sin el render en cascada de un useEffect + setState, y sin
// desincronizar el HTML de servidor (que no tiene acceso a document.cookie) del cliente.
function subscribeToCookies() {
  return () => {};
}

function getUserRoleSnapshot(): Role {
  return (getCookie("userRole") as Role) || "Admin";
}
function getUserRoleServerSnapshot(): Role {
  return "Admin"; // valor por defecto mientras se hidrata en el cliente
}

function getUserNameSnapshot(): string {
  const raw = getCookie("userName");
  return raw ? decodeURIComponent(raw) : "Cargando...";
}
function getUserNameServerSnapshot(): string {
  return "Cargando...";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 1 y 2. Nombre y rol del usuario, leídos directamente de las cookies (sin
  // useEffect + setState, para no disparar el render en cascada que señala
  // react-hooks/set-state-in-effect).
  const userName = useSyncExternalStore(
    subscribeToCookies,
    getUserNameSnapshot,
    getUserNameServerSnapshot
  );
  const userRole = useSyncExternalStore(
    subscribeToCookies,
    getUserRoleSnapshot,
    getUserRoleServerSnapshot
  );

  // 3. Generar las iniciales y el texto del rol de forma dinámica
  const initials = userName === "Cargando..." 
    ? "..." 
    : userName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  const displayRole = userRole === "RRHH" 
    ? "Recursos Humanos" 
    : userRole === "Admin" ? "Administrador" : "Supervisor";

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

          {/* USUARIO (HEADER) */}
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              {/* <-- NOMBRE DINÁMICO AQUÍ --> */}
              <p className="text-sm font-semibold text-slate-800">
                {userName}
              </p>
              {/* <-- ROL DINÁMICO AQUÍ --> */}
              <p className="text-xs text-slate-400">
                {displayRole}
              </p>
            </div>

            {/* <-- INICIALES DINÁMICAS AQUÍ --> */}
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
              {initials}
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
