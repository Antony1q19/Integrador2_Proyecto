// app/api/entrevistas/[id]/route.ts
//   PATCH → reprogramar una entrevista, cerrarla (Realizada / Cancelada / No asistió) o anotar cómo salió
import { NextRequest } from "next/server";
import { reenviarPeticion } from "@/lib/proxyJson";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return reenviarPeticion(request, `/entrevistas/${encodeURIComponent(id)}`);
}
