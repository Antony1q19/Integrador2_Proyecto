// app/api/auth/registro/route.ts
//
// Registra una nueva cuenta de postulante y almacena el JWT en una cookie httpOnly segura.
import { NextRequest, NextResponse } from 'next/server';
import { reenviarAlGateway } from '@/lib/gatewayProxy';
import { esOrigenValido } from '@/lib/csrf';

const DURACION_COOKIE_SEGUNDOS = 60 * 60; // 1 hora

export async function POST(request: NextRequest) {
  if (!esOrigenValido(request)) {
    return NextResponse.json({ error: 'Petición no autorizada (origen inválido)' }, { status: 403 });
  }

  const cuerpo = await request.json().catch(() => null);
  if (!cuerpo) {
    return NextResponse.json({ error: 'Datos de registro inválidos' }, { status: 400 });
  }

  try {
    const respuestaGateway = await reenviarAlGateway('/publico/auth/registro', {
      method: 'POST',
      body: JSON.stringify(cuerpo),
    });

    if (!respuestaGateway.ok) {
      const errorJson = await respuestaGateway.json().catch(() => null);
      return NextResponse.json(
        { error: errorJson?.detail ?? 'No pudimos crear tu cuenta. Verifica los datos ingresados.' },
        { status: respuestaGateway.status }
      );
    }

    const { access_token, usuario } = await respuestaGateway.json();

    const respuesta = NextResponse.json({ usuario });
    respuesta.cookies.set('authToken', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: DURACION_COOKIE_SEGUNDOS,
    });

    return respuesta;
  } catch (error) {
    return NextResponse.json(
      { error: 'No se pudo conectar con el servidor de autenticación' },
      { status: 503 }
    );
  }
}
