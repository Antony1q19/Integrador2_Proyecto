// app/api/postulantes/[id]/solicitar-cuenta/route.ts
//
// POST → pide al backend que envíe (con Mailjet) el correo que invita al postulante a crear su
// cuenta en ANUNCIOS. Solo reenvía al Gateway con el JWT de la cookie httpOnly (ver lib/proxyJson.ts).
import { NextRequest } from "next/server";
import { reenviarPeticion } from "@/lib/proxyJson";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return reenviarPeticion(request, `/postulantes/${encodeURIComponent(id)}/solicitar-cuenta`);
}
