// app/api/postulantes/[id]/documentos/[documentoId]/route.ts
//
// DELETE → elimina un documento (el backend también borra el archivo de Cloudinary).
import { NextRequest, NextResponse } from "next/server";
import { reenviarAlGateway } from "@/lib/gatewayProxy";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentoId: string }> }
) {
  const { id, documentoId } = await params;
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const respuesta = await reenviarAlGateway(
    token,
    `/postulantes/${encodeURIComponent(id)}/documentos/${encodeURIComponent(documentoId)}`,
    { method: "DELETE" }
  );
  if (respuesta.status === 204) return new NextResponse(null, { status: 204 });
  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, { status: respuesta.status, headers: { "Content-Type": "application/json" } });
}
