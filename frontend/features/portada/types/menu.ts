import {
    LayoutDashboard,
    MessageCircle,
    Megaphone,
    Building2,
    UserCircle,
    Users,
} from "lucide-react";

// 1. Cambiamos los tipos para que coincidan con mockAuth.ts
export type Role = "Admin" | "RRHH" | "Supervisor";

export interface MenuItem {
    name: string;
    href: string;
    icon: any;
    roles: Role[];
}

export const menuItems: MenuItem[] = [
    {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["Admin", "RRHH", "Supervisor"],
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
    {
        name: "Postulantes",
        href: "/postulantes",
        icon: Users,
        roles: ["Admin", "RRHH", "Supervisor"],
    },
];