// app/api/auth/restablecer/route.ts
//
// Restablece la contraseña enviando el token y la nueva contraseña al Gateway.
import { NextRequest, NextResponse } from 'next/server';
import { reenviarAlGateway } from '@/lib/gatewayProxy';
import { esOrigenValido } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  if (!esOrigenValido(request)) {
    return NextResponse.json({ error: 'Petición no autorizada (origen inválido)' }, { status: 403 });
  }

  const cuerpo = await request.json().catch(() => null);
  if (!cuerpo || !cuerpo.token || !cuerpo.nuevaPassword) {
    return NextResponse.json({ error: 'Token y nueva contraseña son obligatorios' }, { status: 400 });
  }

  try {
    const respuestaGateway = await reenviarAlGateway('/publico/auth/restablecer-password', {
      method: 'POST',
      body: JSON.stringify({ token: cuerpo.token, nuevaPassword: cuerpo.nuevaPassword }),
    });

    if (!respuestaGateway.ok) {
      const errorJson = await respuestaGateway.json().catch(() => null);
      return NextResponse.json(
        { error: errorJson?.detail ?? 'El enlace no es válido o venció' },
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
