import { Anuncio } from "@/features/anuncios/types/anuncio";

export const anunciosMock: Anuncio[] = [
  {
    id: 1,
    cargo: "Desarrollador Full Stack Senior",
    descripcion:
      "Buscamos un desarrollador full stack con experiencia en React y Node.js para liderar el desarrollo de nuevas funcionalidades en nuestra plataforma principal.",
    requisitos:
      "5+ años de experiencia, conocimientos en TypeScript, React, Node.js y bases de datos relacionales.",
    numeroVacantes: 2,
    salarioMin: 6000,
    salarioMax: 9000,
    fechaLimite: "2026-10-15",
    estado: "Abierto",
    empresaId: 1,
    empresaRazonSocial: "Consultora Andina S.A.C.",
    fechaCreacion: "2026-08-01",
  },
  {
    id: 2,
    cargo: "Analista de Logística",
    descripcion:
      "Encargado de coordinar rutas de distribución y optimizar tiempos de entrega en la zona sur del país.",
    requisitos:
      "Experiencia previa en logística, manejo de Excel avanzado, licencia de conducir vigente.",
    numeroVacantes: 1,
    salarioMin: 2800,
    salarioMax: 3500,
    fechaLimite: "2026-09-30",
    estado: "En proceso",
    empresaId: 2,
    empresaRazonSocial: "Grupo Logístico Pacífico E.I.R.L.",
    fechaCreacion: "2026-07-15",
  },
  {
    id: 3,
    cargo: "Asesor Financiero",
    descripcion:
      "Responsable de asesorar a clientes sobre productos financieros y gestionar cartera de inversión.",
    requisitos:
      "Título en Economía, Finanzas o afines. Certificación CFA valorada. 3+ años de experiencia.",
    numeroVacantes: 3,
    salarioMin: 3500,
    salarioMax: 5000,
    fechaLimite: "2026-11-01",
    estado: "Abierto",
    empresaId: 3,
    empresaRazonSocial: "Financiera Horizonte S.A.",
    fechaCreacion: "2026-08-10",
  },
  {
    id: 4,
    cargo: "Jefe de Tienda",
    descripcion:
      "Liderar el equipo de ventas de una de nuestras tiendas insignia, con foco en cumplimiento de metas comerciales.",
    requisitos:
      "Experiencia mínima de 4 años en retail, habilidades de liderazgo comprobadas.",
    numeroVacantes: 1,
    salarioMin: 3000,
    salarioMax: 4000,
    fechaLimite: "2026-07-20",
    estado: "Cerrado",
    empresaId: 4,
    empresaRazonSocial: "Retail Sur Perú S.A.C.",
    fechaCreacion: "2026-06-05",
  },
];