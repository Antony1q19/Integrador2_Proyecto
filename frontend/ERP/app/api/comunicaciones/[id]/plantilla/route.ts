// app/api/comunicaciones/[id]/plantilla/route.ts
//   POST → enviar una plantilla aprobada de WhatsApp a esta conversación
import { NextRequest } from "next/server";
import { reenviarPeticion } from "@/lib/proxyJson";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return reenviarPeticion(request, `/comunicaciones/conversaciones/${encodeURIComponent(id)}/plantilla`);
}
