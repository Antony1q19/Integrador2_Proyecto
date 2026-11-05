import type { Metadata } from "next";
import { PlantillasWhatsAppView } from "@/features/comunicaciones/components/PlantillasWhatsAppView";

export const metadata: Metadata = { title: "Plantillas de WhatsApp" };

export default function PlantillasWhatsAppPage() {
  return <PlantillasWhatsAppView />;
}
