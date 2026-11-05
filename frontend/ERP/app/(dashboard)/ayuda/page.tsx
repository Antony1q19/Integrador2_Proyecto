import type { Metadata } from "next";
import { AyudaView } from "@/features/ayuda/components/AyudaView";

export const metadata: Metadata = { title: "Ayuda" };

export default function AyudaPage() {
  return <AyudaView />;
}
