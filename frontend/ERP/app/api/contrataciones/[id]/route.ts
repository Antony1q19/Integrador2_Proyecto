// app/api/contrataciones/[id]/route.ts
//   PATCH → corregir los datos de una contratación o cambiar su estado
import { NextRequest } from "next/server";
import { reenviarPeticion } from "@/lib/proxyJson";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return reenviarPeticion(request, `/contrataciones/${encodeURIComponent(id)}`);
}
