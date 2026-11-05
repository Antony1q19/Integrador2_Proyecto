// app/api/comunicaciones/plantillas/[nombre]/route.ts
//   DELETE → eliminar una plantilla de WhatsApp
import { NextRequest } from "next/server";
import { reenviarPeticion } from "@/lib/proxyJson";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ nombre: string }> }) {
  const { nombre } = await params;
  return reenviarPeticion(request, `/comunicaciones/plantillas/${encodeURIComponent(nombre)}`);
}
