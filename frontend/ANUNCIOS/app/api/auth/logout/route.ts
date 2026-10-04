// app/api/auth/logout/route.ts
//
// Cierra la sesión eliminando la cookie authToken.
import { NextRequest, NextResponse } from 'next/server';
import { esOrigenValido } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  if (!esOrigenValido(request)) {
    return NextResponse.json({ error: 'Petición no autorizada (origen inválido)' }, { status: 403 });
  }

  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.delete('authToken');
  return respuesta;
}
