// app/api/anuncios/[id]/route.ts
//
// GET    → detalle de un anuncio (404 si no existe o no es visible para el usuario)
// PUT    → edita un anuncio existente (Admin, RRHH), sin tocar su estado
// DELETE → elimina un anuncio (borrado lógico; Admin, RRHH)
import { NextRequest, NextResponse } from "next/server";
import { reenviarAlGateway } from "@/lib/gatewayProxy";

async function reenviarYResponder(respuestaGateway: Response): Promise<NextResponse> {
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
  const respuesta = await reenviarAlGateway(token, `/anuncios/${id}`);
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
  const respuesta = await reenviarAlGateway(token, `/anuncios/${id}`, {
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
  const respuesta = await reenviarAlGateway(token, `/anuncios/${id}`, {
    method: "DELETE",
  });
  return reenviarYResponder(respuesta);
}