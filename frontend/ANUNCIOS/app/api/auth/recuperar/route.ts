// app/api/auth/recuperar/route.ts
//
// Solicita el enlace de recuperación de contraseña al Gateway.
import { NextRequest, NextResponse } from 'next/server';
import { reenviarAlGateway } from '@/lib/gatewayProxy';
import { esOrigenValido } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  if (!esOrigenValido(request)) {
    return NextResponse.json({ error: 'Petición no autorizada (origen inválido)' }, { status: 403 });
  }

  const cuerpo = await request.json().catch(() => null);
  if (!cuerpo || !cuerpo.email) {
    return NextResponse.json({ error: 'Ingresa un correo electrónico' }, { status: 400 });
  }

  try {
    const respuestaGateway = await reenviarAlGateway('/publico/auth/recuperar-password', {
      method: 'POST',
      body: JSON.stringify({ email: cuerpo.email }),
    });

    if (!respuestaGateway.ok) {
      const errorJson = await respuestaGateway.json().catch(() => null);
      const headers = new Headers();
      const retryAfter = respuestaGateway.headers.get('retry-after');
      if (retryAfter) {
        headers.set('Retry-After', retryAfter);
      }
      return NextResponse.json(
        { error: errorJson?.detail ?? 'No se pudo procesar la solicitud en este momento.' },
        { status: respuestaGateway.status, headers }
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
