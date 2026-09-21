// app/api/procesos/postulante/[postulanteId]/anuncio/[anuncioId]/estado/route.ts
//
// PATCH → mueve la postulación de un postulante a otra etapa (Postulado, En
// evaluación, Entrevista...). El backend deja constancia en el historial con el
// nombre de quien tiene la sesión iniciada.
import { NextRequest, NextResponse } from "next/server";
import { reenviarAlGateway } from "@/lib/gatewayProxy";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ postulanteId: string; anuncioId: string }> }
) {
  const { postulanteId, anuncioId } = await params;
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const cuerpoPeticion = await request.text();
  const respuesta = await reenviarAlGateway(
    token,
    `/procesos/postulante/${encodeURIComponent(postulanteId)}/anuncio/${encodeURIComponent(anuncioId)}/estado`,
    { method: "PATCH", body: cuerpoPeticion }
  );
  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, { status: respuesta.status, headers: { "Content-Type": "application/json" } });
}
