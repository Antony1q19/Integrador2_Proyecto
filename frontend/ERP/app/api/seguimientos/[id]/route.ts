// app/api/seguimientos/[id]/route.ts
//   PATCH → registrar cómo salió un control (valoración, observaciones) o reprogramarlo
import { NextRequest } from "next/server";
import { reenviarPeticion } from "@/lib/proxyJson";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return reenviarPeticion(request, `/seguimientos/${encodeURIComponent(id)}`);
}
