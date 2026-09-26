// app/api/postulantes/[id]/documentos/[documentoId]/archivo/route.ts
//
//   GET → entrega el archivo en sí (bytes) para verlo en el visor o descargarlo. El backend
//         lo lee de Supabase Storage (bucket privado) y solo lo entrega a quien tiene sesión y rol.
//   PUT → reemplaza el archivo de un documento existente (multipart). Se sube el
//         nuevo a Storage y recién entonces se borra el anterior.
import { NextRequest, NextResponse } from "next/server";
import { reenviarAlGateway } from "@/lib/gatewayProxy";

type Contexto = { params: Promise<{ id: string; documentoId: string }> };

export async function GET(request: NextRequest, { params }: Contexto) {
  const { id, documentoId } = await params;
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const respuesta = await reenviarAlGateway(
    token,
    `/postulantes/${encodeURIComponent(id)}/documentos/${encodeURIComponent(documentoId)}/contenido`
  );
  // Es un archivo (no JSON): se devuelven los bytes tal cual, con su tipo (application/pdf, image/png...).
  const cuerpo = await respuesta.arrayBuffer();
  return new NextResponse(cuerpo, {
    status: respuesta.status,
    headers: {
      "Content-Type": respuesta.headers.get("content-type") ?? "application/octet-stream",
      // El archivo es privado: que ningún caché lo guarde.
      "Cache-Control": "private, no-store",
    },
  });
}

export async function PUT(request: NextRequest, { params }: Contexto) {
  const { id, documentoId } = await params;
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const cuerpoPeticion = await request.arrayBuffer();
  const respuesta = await reenviarAlGateway(
    token,
    `/postulantes/${encodeURIComponent(id)}/documentos/${encodeURIComponent(documentoId)}/archivo`,
    {
      method: "PUT",
      body: cuerpoPeticion,
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }
  );
  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, { status: respuesta.status, headers: { "Content-Type": "application/json" } });
}
