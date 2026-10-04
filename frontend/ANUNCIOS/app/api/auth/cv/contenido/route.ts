// app/api/auth/cv/contenido/route.ts
//
// Devuelve el archivo del CV del postulante para verlo en el navegador.
// El bucket es privado: el archivo pasa por aquí con la cookie de sesión.
import { NextRequest, NextResponse } from 'next/server';
import { reenviarAlGateway } from '@/lib/gatewayProxy';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('authToken')?.value;
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const respuestaGateway = await reenviarAlGateway('/publico/auth/cv/contenido', { method: 'GET' }, token);
    if (!respuestaGateway.ok) {
      const errorJson = await respuestaGateway.json().catch(() => null);
      return NextResponse.json(
        { error: errorJson?.detail ?? 'No se pudo obtener el CV' },
        { status: respuestaGateway.status }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': respuestaGateway.headers.get('content-type') ?? 'application/octet-stream',
      'Cache-Control': 'private, no-store',
    };
    const disposicion = respuestaGateway.headers.get('content-disposition');
    if (disposicion) headers['Content-Disposition'] = disposicion;

    return new NextResponse(await respuestaGateway.arrayBuffer(), { status: 200, headers });
  } catch {
    return NextResponse.json({ error: 'No se pudo conectar con el servidor' }, { status: 503 });
  }
}
