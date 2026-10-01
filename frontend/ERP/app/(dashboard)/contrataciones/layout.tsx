// Solo pone el título de la pestaña de esta sección ("Contrataciones | TalentERP").
// Va en un layout porque varias páginas son "use client" y no pueden exportar metadata.
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contrataciones" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
