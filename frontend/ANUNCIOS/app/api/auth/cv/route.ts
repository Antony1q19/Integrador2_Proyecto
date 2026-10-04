// app/api/auth/cv/route.ts
//
// Sube (POST) o elimina (DELETE) el CV del postulante en el Gateway.
// El archivo llega como multipart/form-data y se reenvía tal cual.
import { NextRequest, NextResponse } from 'next/server';
import { reenviarAlGateway } from '@/lib/gatewayProxy';
import { esOrigenValido } from '@/lib/csrf';

async function reenviarError(respuestaGateway: Response, mensaje: string) {
  const errorJson = await respuestaGateway.json().catch(() => null);
  return NextResponse.json(
    { error: errorJson?.detail ?? mensaje },
    { status: respuestaGateway.status }
  );
}

export async function POST(request: NextRequest) {
  if (!esOrigenValido(request)) {
    return NextResponse.json({ error: 'Petición no autorizada (origen inválido)' }, { status: 403 });
  }

  const token = request.cookies.get('authToken')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Debes iniciar sesión para subir tu CV' }, { status: 401 });
  }

  try {
    const respuestaGateway = await reenviarAlGateway(
      '/publico/auth/cv',
      {
        method: 'POST',
        // Se conserva el Content-Type original (incluye el "boundary" del multipart).
        headers: { 'Content-Type': request.headers.get('content-type') ?? '' },
        body: await request.arrayBuffer(),
      },
      token
    );

    if (!respuestaGateway.ok) {
      return reenviarError(respuestaGateway, 'No se pudo subir el CV');
    }
    return NextResponse.json(await respuestaGateway.json(), { status: 201 });
  } catch {
    return NextResponse.json({ error: 'No se pudo conectar con el servidor' }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!esOrigenValido(request)) {
    return NextResponse.json({ error: 'Petición no autorizada (origen inválido)' }, { status: 403 });
  }

  const token = request.cookies.get('authToken')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
  }

  try {
    const respuestaGateway = await reenviarAlGateway('/publico/auth/cv', { method: 'DELETE' }, token);
    if (!respuestaGateway.ok) {
      return reenviarError(respuestaGateway, 'No se pudo eliminar el CV');
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'No se pudo conectar con el servidor' }, { status: 503 });
  }
}
