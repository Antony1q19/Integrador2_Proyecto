// app/api/comunicaciones/plantillas-rapidas/[id]/route.ts
//   PUT → editar una plantilla rápida del chat
import { NextRequest } from "next/server";
import { reenviarPeticion } from "@/lib/proxyJson";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return reenviarPeticion(request, `/comunicaciones/plantillas-rapidas/${encodeURIComponent(id)}`);
}
