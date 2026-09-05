import {
    LayoutDashboard,
    MessageCircle,
    Megaphone,
    Building2,
    UserCircle,
    Users,
    type LucideIcon,
} from "lucide-react";

// 1. Cambiamos los tipos para que coincidan con mockAuth.ts
export type Role = "Admin" | "RRHH" | "Supervisor";

export interface MenuSubItem {
    name: string;
    href: string;
}

export interface MenuItem {
    name: string;
    href: string;
    icon: LucideIcon;
    roles: Role[];
    subItems?: MenuSubItem[];
}

export const menuItems: MenuItem[] = [
    {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["Admin", "RRHH", "Supervisor"],
    },
    {
        name: "Postulantes",
        href: "/postulantes",
        icon: Users,
        roles: ["Admin", "RRHH", "Supervisor"],
        subItems: [
            { name: "Listado", href: "/postulantes" },
            { name: "Pipeline", href: "/postulantes/pipeline" },
        ],
    },
    {
        name: "Comunicaciones",
        href: "/comunicaciones",
        icon: MessageCircle,
        roles: ["Admin", "RRHH", "Supervisor"],
    },
    {
        name: "Anuncios",
        href: "/anuncios",
        icon: Megaphone,
        roles: ["Admin", "RRHH", "Supervisor"],
    },
    {
        name: "Empresas",
        href: "/empresas",
        icon: Building2,
        roles: ["Admin", "RRHH", "Supervisor"],
    },
    {
        name: "Perfil",
        href: "/perfil",
        icon: UserCircle,
        roles: ["Admin", "RRHH", "Supervisor"],
    },
];