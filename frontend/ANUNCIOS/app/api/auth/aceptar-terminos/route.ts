// app/api/auth/aceptar-terminos/route.ts
//
// Registra la aceptación de la versión vigente de términos en el Gateway.
import { NextRequest, NextResponse } from 'next/server';
import { reenviarAlGateway } from '@/lib/gatewayProxy';
import { esOrigenValido } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  if (!esOrigenValido(request)) {
    return NextResponse.json({ error: 'Petición no autorizada (origen inválido)' }, { status: 403 });
  }

  const token = request.cookies.get('authToken')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Debes iniciar sesión para aceptar los términos' }, { status: 401 });
  }

  const cuerpo = await request.json().catch(() => null);
  const version = cuerpo?.version ?? '2026-01';

  try {
    const respuestaGateway = await reenviarAlGateway(
      '/publico/auth/aceptar-terminos',
      {
        method: 'POST',
        body: JSON.stringify({ version }),
      },
      token
    );

    if (!respuestaGateway.ok) {
      const errorJson = await respuestaGateway.json().catch(() => null);
      return NextResponse.json(
        { error: errorJson?.detail ?? 'No se pudo registrar la aceptación de términos' },
        { status: respuestaGateway.status }
      );
    }

    const data = await respuestaGateway.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'No se pudo conectar con el servidor' },
      { status: 503 }
    );
  }
}
