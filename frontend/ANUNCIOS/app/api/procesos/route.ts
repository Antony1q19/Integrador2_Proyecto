// app/api/procesos/route.ts
//
// Proxy al Gateway para las postulaciones del postulante logueado.
// - GET  → lista las postulaciones del postulante autenticado.
// - POST → crea una nueva postulación (el postulante se postula a un anuncio).
import { NextRequest, NextResponse } from 'next/server';
import { reenviarAlGateway } from '@/lib/gatewayProxy';
import { esOrigenValido } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('authToken')?.value;
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const respuestaGateway = await reenviarAlGateway('/publico/procesos', { method: 'GET' }, token);
    const data = await respuestaGateway.json().catch(() => []);
    return NextResponse.json(data, { status: respuestaGateway.status });
  } catch {
    return NextResponse.json({ error: 'No se pudo conectar con el servidor' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!esOrigenValido(request)) {
    return NextResponse.json({ error: 'Petición no autorizada (origen inválido)' }, { status: 403 });
  }

  const token = request.cookies.get('authToken')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Debes iniciar sesión para postularte' }, { status: 401 });
  }

  try {
    const cuerpo = await request.json();
    const respuestaGateway = await reenviarAlGateway(
      '/publico/procesos',
      {
        method: 'POST',
        body: JSON.stringify(cuerpo),
      },
      token
    );

    const data = await respuestaGateway.json().catch(() => ({}));

    if (!respuestaGateway.ok) {
      return NextResponse.json(
        { error: data?.detail ?? 'No se pudo completar la postulación' },
        { status: respuestaGateway.status }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'No se pudo conectar con el servidor' }, { status: 503 });
  }
}