// app/api/comunicaciones/[id]/leer/route.ts
//   POST → marcar la conversación como leída (pone en 0 los no leídos y manda el visto azul a WhatsApp)
import { NextRequest } from "next/server";
import { reenviarPeticion } from "@/lib/proxyJson";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return reenviarPeticion(request, `/comunicaciones/conversaciones/${encodeURIComponent(id)}/leer`);
}
