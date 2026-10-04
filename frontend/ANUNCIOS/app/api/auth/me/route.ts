// app/api/auth/me/route.ts
//
// Devuelve la sesión del postulante actual validando el JWT contra el Gateway.
// Si el token es inválido o venció (ej. cambio de clave), elimina la cookie y responde 401.
import { NextRequest, NextResponse } from 'next/server';
import { reenviarAlGateway } from '@/lib/gatewayProxy';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('authToken')?.value;

  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const respuestaGateway = await reenviarAlGateway('/publico/auth/me', { method: 'GET' }, token);

    if (!respuestaGateway.ok) {
      // Token expirado o invalidado: limpiar cookie
      const respuesta = NextResponse.json(
        { error: 'Sesión expirada o inválida' },
        { status: 401 }
      );
      respuesta.cookies.delete('authToken');
      return respuesta;
    }

    const usuario = await respuestaGateway.json();
    return NextResponse.json({ usuario });
  } catch (error) {
    return NextResponse.json(
      { error: 'No se pudo verificar la sesión con el servidor' },
      { status: 503 }
    );
  }
}
