import {
    LayoutDashboard,
    MessageCircle,
    Megaphone,
    Building2,
    UserCircle,
    Users,
} from "lucide-react";

export type Role = "ADMIN" | "RRHH" | "RECLUTADOR";

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
        roles: ["ADMIN", "RRHH", "RECLUTADOR"],
    },

    {
        name: "Comunicaciones",
        href: "/comunicaciones",
        icon: MessageCircle,
        roles: ["ADMIN", "RRHH", "RECLUTADOR"],
    },

    {
        name: "Anuncios",
        href: "/anuncios",
        icon: Megaphone,
        roles: ["ADMIN", "RRHH", "RECLUTADOR"],
    },

    {
        name: "Empresas",
        href: "/empresas",
        icon: Building2,
        roles: ["ADMIN", "RRHH", "RECLUTADOR"],
    },

    {
        name: "Perfil",
        href: "/perfil",
        icon: UserCircle,
        roles: ["ADMIN", "RRHH", "RECLUTADOR"],
    },

    {
        name: "Postulantes",
        href: "/postulantes",
        icon: Users,
        roles: ["ADMIN", "RRHH", "RECLUTADOR"],
    },
];