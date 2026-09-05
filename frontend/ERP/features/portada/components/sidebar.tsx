"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    ChevronLeft,
    LogOut,
    Zap,
} from "lucide-react";

import { menuItems, Role } from "@/features/portada/types/menu";

// 1. Agregamos userName a las propiedades que recibe el Sidebar
interface SidebarProps {
    role: Role;
    userName?: string; 
    open: boolean;
    setOpen: (value: boolean) => void;
}

export default function Sidebar({
    role,
    userName = "Usuario", // Valor por defecto por si acaso
    open,
    setOpen,
}: SidebarProps) {

    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        // 2. Borramos AMBAS cookies al salir (rol y nombre)
        document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "userName=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        
        router.push("/login");
        router.refresh();
    };

    const filteredItems = menuItems.filter((item) =>
        item.roles.includes(role)
    );

    // 3. Generamos las iniciales (Ej: "Leonardo Morales" -> "LM")
    const initials = userName === "Cargando..." 
      ? "..." 
      : userName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

    // 4. Formateamos el texto del rol
    const displayRole = role === "RRHH" 
      ? "Recursos Humanos" 
      : role === "Admin" ? "Administrador" : "Supervisor";

    return (
        <>
            {/* Fondo oscuro en celular */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* SIDEBAR */}
            <aside
                className={`
          fixed left-0 top-0 z-50
          h-screen w-72
          overflow-hidden
          bg-gradient-to-b
          from-[#111827]
          via-[#172554]
          to-[#312e81]
          text-white
          shadow-2xl
          transition-transform
          duration-300
          lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
            >

                {/* Decoración superior */}
                <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-600/20 blur-3xl" />
                <div className="absolute -left-20 top-1/3 h-56 w-56 rounded-full bg-blue-600/10 blur-3xl" />

                {/* CONTENIDO */}
                <div className="relative z-10 flex h-full flex-col">

                    {/* LOGO */}
                    <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-violet-900/40">
                            <Zap size={23} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">
                                Talent<span className="text-violet-400">ERP</span>
                            </h1>
                            <p className="text-[11px] text-slate-400">Recursos Humanos</p>
                        </div>
                    </div>


                    {/* PERFIL USUARIO (AHORA ES DINÁMICO) */}
                    <div className="mx-4 mt-6 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="relative">
                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold shadow-lg">
                                    {initials}
                                </div>
                                {/* Estado online */}
                                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#172554] bg-emerald-400" />
                            </div>

                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">
                                    {userName}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                    {displayRole}
                                </p>
                            </div>
                        </div>
                    </div>


                    {/* MENU */}
                    <nav className="mt-7 flex-1 px-4">
                        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                            Menú principal
                        </p>

                        <div className="space-y-2">
                            {filteredItems.map((item) => {
                                const Icon = item.icon;
                                const active = pathname === item.href;

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        className={`
                      group relative flex items-center gap-3 overflow-hidden rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200
                      ${active ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-950/30" : "text-slate-300 hover:bg-white/[0.08] hover:text-white"}
                    `}
                                    >
                                        {/* Brillo del elemento activo */}
                                        {active && <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />}

                                        {/* Icono */}
                                        <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-lg transition ${active ? "bg-white/15" : "bg-white/5 group-hover:bg-white/10"}`}>
                                            <Icon size={18} />
                                        </div>

                                        {/* Texto */}
                                        <span className="relative z-10">{item.name}</span>

                                        {/* Indicador */}
                                        {active && <span className="relative z-10 ml-auto h-2 w-2 rounded-full bg-white shadow-lg" />}
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>


                    {/* PARTE INFERIOR */}
                    <div className="px-4 pb-5">
                        {/* Separador */}
                        <div className="mb-4 h-px bg-white/10" />

                        {/* Cerrar sesión */}
                        <button
                            onClick={handleLogout} 
                            className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 group-hover:bg-red-500/10">
                                <LogOut size={18} />
                            </div>
                            <span>Cerrar sesión</span>
                        </button>

                        {/* Versión */}
                        <p className="mt-4 text-center text-[10px] text-slate-600">
                            TalentERP v1.0.0
                        </p>
                    </div>

                </div>

                {/* Botón cerrar en móvil */}
                <button
                    onClick={() => setOpen(false)}
                    className="absolute right-3 top-6 rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden"
                >
                    <ChevronLeft size={20} />
                </button>

            </aside>
        </>
    );
}