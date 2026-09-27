// app/api/anuncios/[id]/estado/route.ts
//
// PATCH → cambia únicamente el estado de un anuncio (Abierto | En proceso | Cerrado).
// Separado del PUT de edición completa a propósito, siguiendo el mismo diseño del backend.
import { NextRequest, NextResponse } from "next/server";
import { reenviarAlGateway } from "@/lib/gatewayProxy";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const cuerpoPeticion = await request.text();
  const respuesta = await reenviarAlGateway(token, `/anuncios/${id}/estado`, {
    method: "PATCH",
    body: cuerpoPeticion,
  });

  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, {
    status: respuesta.status,
    headers: { "Content-Type": "application/json" },
  });
}