// app/api/empresas/[id]/route.ts
//
// GET    → detalle de una empresa (404 si no existe o no es visible para el usuario)
// PUT    → edita una empresa existente (Admin, RRHH)
// DELETE → elimina una empresa (borrado lógico; Admin, RRHH). 409 si tiene anuncios activos.
import { NextRequest, NextResponse } from "next/server";
import { reenviarAlGateway } from "@/lib/gatewayProxy";

async function reenviarYResponder(
  respuestaGateway: Response
): Promise<NextResponse> {
  // DELETE exitoso devuelve 204 sin body; leer .text() ahí da un string
  // vacío, así que lo tratamos aparte para no mandar un Content-Type
  // engañoso sobre una respuesta sin contenido.
  if (respuestaGateway.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  const cuerpo = await respuestaGateway.text();
  return new NextResponse(cuerpo, {
    status: respuestaGateway.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const respuesta = await reenviarAlGateway(token, `/empresas/${id}`);
  return reenviarYResponder(respuesta);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const cuerpoPeticion = await request.text();
  const respuesta = await reenviarAlGateway(token, `/empresas/${id}`, {
    method: "PUT",
    body: cuerpoPeticion,
  });
  return reenviarYResponder(respuesta);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const respuesta = await reenviarAlGateway(token, `/empresas/${id}`, {
    method: "DELETE",
  });
  return reenviarYResponder(respuesta);
}