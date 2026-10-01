"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    ChevronDown,
    ChevronLeft,
    LogOut,
    Zap,
} from "lucide-react";

import { menuItems, Role } from "@/features/portada/types/menu";
import { cerrarSesionApi } from "@/features/login/sesion/authService";

interface SidebarProps {
    role: Role;
    open: boolean;
    setOpen: (value: boolean) => void;
}

export default function Sidebar({
    role,
    open,
    setOpen,
}: SidebarProps) {

    const pathname = usePathname();

    // ¿Estoy en esta sección? También cuenta una subpágina: en "/empresas/5" sigue
    // marcada "Empresas" (antes solo se marcaba con la ruta exacta).
    const estaEn = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
    const router = useRouter();
    const [submenusManuales, setSubmenusManuales] = useState<Record<string, boolean>>({});

    const handleLogout = async () => {
        // Borramos las cookies de sesión al salir: rol y nombre acá mismo;
        // el JWT (cookie httpOnly, JS no puede tocarla) lo borra el propio
        // servidor en /api/auth/logout -ver
        // features/login/sesion/authService.ts -> cerrarSesionApi()-.
        document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "userName=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "userEmail=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "userEmpresas=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        await cerrarSesionApi().catch(() => {});

        router.push("/login");
        router.refresh();
    };

    const filteredItems = menuItems.filter((item) =>
        item.roles.includes(role)
    );

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
          from-slate-900
          via-primary-950
          to-primary-900
          text-white
          shadow-2xl
          transition-transform
          duration-300
          lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
            >

                {/* Decoración superior */}
                <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary-600/20 blur-3xl" />
                <div className="absolute -left-20 top-1/3 h-56 w-56 rounded-full bg-primary-600/10 blur-3xl" />

                {/* CONTENIDO */}
                <div className="relative z-10 flex h-full flex-col">

                    {/* LOGO */}
                    <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-900/40">
                            <Zap size={23} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">
                                Talent<span className="text-primary-400">ERP</span>
                            </h1>
                            <p className="text-[11px] text-slate-400">Recursos Humanos</p>
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
                                const active = estaEn(item.href);
                                const tieneSubItems = !!item.subItems?.length;
                                // Del submenú se marca la coincidencia MÁS específica: en "/postulantes/pipeline"
                                // coinciden "Listado" (/postulantes) y "Pipeline"; gana "Pipeline".
                                const subActivoHref = item.subItems
                                    ?.filter((sub) => estaEn(sub.href))
                                    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
                                const subItemActivo = subActivoHref !== undefined;
                                const expandido = submenusManuales[item.name] ?? (active || subItemActivo);

                                return (
                                    <div key={item.name}>
                                        <div
                                            className={`
                        group relative flex items-center gap-3 overflow-hidden rounded-xl text-sm font-medium transition-all duration-200
                        ${active ? "bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-950/30" : "text-slate-300 hover:bg-white/[0.08] hover:text-white"}
                      `}
                                        >
                                            {/* Brillo del elemento activo */}
                                            {active && <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />}

                                            <Link
                                                href={item.href}
                                                aria-current={active ? "page" : undefined}
                                                onClick={() => setOpen(false)}
                                                className="relative z-10 flex flex-1 items-center gap-3 px-4 py-3"
                                            >
                                                {/* Icono */}
                                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${active ? "bg-white/15" : "bg-white/5 group-hover:bg-white/10"}`}>
                                                    <Icon size={18} />
                                                </div>

                                                {/* Texto */}
                                                <span>{item.name}</span>

                                                {/* Indicador */}
                                                {active && <span className="ml-auto h-2 w-2 rounded-full bg-white shadow-lg" />}
                                            </Link>

                                            {/* Toggle de submenú */}
                                            {tieneSubItems && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSubmenusManuales((prev) => ({
                                                            ...prev,
                                                            [item.name]: !expandido,
                                                        }))
                                                    }
                                                    aria-label={expandido ? `Contraer ${item.name}` : `Expandir ${item.name}`}
                                                    className="relative z-10 flex h-9 w-9 items-center justify-center rounded-lg text-inherit transition hover:bg-white/10"
                                                >
                                                    <ChevronDown
                                                        size={16}
                                                        className={`transition-transform duration-200 ${expandido ? "rotate-180" : ""}`}
                                                    />
                                                </button>
                                            )}
                                        </div>

                                        {/* Submenú */}
                                        {tieneSubItems && expandido && (
                                            <div className="ml-6 mt-1 space-y-1 border-l border-white/10 pl-4">
                                                {item.subItems!.map((sub) => {
                                                    const subActive = sub.href === subActivoHref;
                                                    return (
                                                        <Link
                                                            key={sub.href}
                                                            href={sub.href}
                                                            aria-current={subActive ? "page" : undefined}
                                                            onClick={() => setOpen(false)}
                                                            className={`block rounded-lg px-3 py-2 text-sm transition ${
                                                                subActive
                                                                    ? "font-medium text-white"
                                                                    : "text-slate-400 hover:bg-white/[0.08] hover:text-white"
                                                            }`}
                                                        >
                                                            {sub.name}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
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