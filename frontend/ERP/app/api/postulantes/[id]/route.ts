// app/api/postulantes/[id]/route.ts
//
// Ficha de UN postulante: GET (ver) y PATCH (editar datos personales).
// Mismo patrón que /api/postulantes: el navegador llama acá (mismo origen), y
// este archivo, que corre en el servidor, lee el JWT de la cookie httpOnly y
// reenvía la petición al Gateway. El token nunca pasa por JavaScript del cliente.
import { NextRequest, NextResponse } from "next/server";
import { reenviarAlGateway } from "@/lib/gatewayProxy";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Contexto) {
  const { id } = await params;
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const respuesta = await reenviarAlGateway(token, `/postulantes/${encodeURIComponent(id)}`);
  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, { status: respuesta.status, headers: { "Content-Type": "application/json" } });
}

export async function PATCH(request: NextRequest, { params }: Contexto) {
  const { id } = await params;
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const cuerpoPeticion = await request.text();
  const respuesta = await reenviarAlGateway(token, `/postulantes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: cuerpoPeticion,
  });
  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, { status: respuesta.status, headers: { "Content-Type": "application/json" } });
}
