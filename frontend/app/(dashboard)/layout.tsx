"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/features/portada/components/sidebar";
import { Role } from "@/features/portada/types/menu"; // Asegúrate de tener este import

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // 1. Estados para guardar los datos del usuario
  const [userName, setUserName] = useState("Cargando...");
  const [userRole, setUserRole] = useState<Role>("Admin"); // Por defecto Admin mientras carga

  // 2. Leer las cookies al cargar el componente
  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
      return null;
    };

    const storedRole = getCookie("userRole") as Role;
    // Decodificamos por si el nombre tiene espacios (ej: "Sofía%20Castro")
    const storedName = getCookie("userName") ? decodeURIComponent(getCookie("userName") as string) : null;

    if (storedRole) setUserRole(storedRole);
    if (storedName) setUserName(storedName);
  }, []);

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
        userName={userName} // <-- Pasamos el nombre al Sidebar
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