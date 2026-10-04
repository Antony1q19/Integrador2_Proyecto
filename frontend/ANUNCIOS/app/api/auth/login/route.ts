// app/api/auth/login/route.ts
//
// Inicia sesión a través del Gateway y almacena el JWT en una cookie httpOnly segura.
// El navegador NUNCA recibe el token en su JavaScript.
import { NextRequest, NextResponse } from 'next/server';
import { reenviarAlGateway } from '@/lib/gatewayProxy';
import { esOrigenValido } from '@/lib/csrf';

const DURACION_COOKIE_SEGUNDOS = 60 * 60; // 1 hora

export async function POST(request: NextRequest) {
  if (!esOrigenValido(request)) {
    return NextResponse.json({ error: 'Petición no autorizada (origen inválido)' }, { status: 403 });
  }

  const cuerpo = await request.json().catch(() => null);
  if (!cuerpo || !cuerpo.email || !cuerpo.password) {
    return NextResponse.json({ error: 'Ingresa tu correo y contraseña' }, { status: 400 });
  }

  try {
    const respuestaGateway = await reenviarAlGateway('/publico/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: cuerpo.email, password: cuerpo.password }),
    });

    if (!respuestaGateway.ok) {
      const errorJson = await respuestaGateway.json().catch(() => null);
      const headers = new Headers();
      const retryAfter = respuestaGateway.headers.get('retry-after');
      if (retryAfter) {
        headers.set('Retry-After', retryAfter);
      }
      return NextResponse.json(
        { error: errorJson?.detail ?? 'Correo o contraseña incorrectos' },
        { status: respuestaGateway.status, headers }
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
