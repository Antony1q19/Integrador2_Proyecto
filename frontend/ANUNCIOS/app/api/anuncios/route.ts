// app/api/anuncios/route.ts
//
// Proxy público al Gateway para que el NAVEGADOR pueda listar anuncios.
// (El servicio `anunciosService.ts` funciona solo en el servidor porque usa
// GATEWAY_INTERNAL_URL; esta ruta expone los mismos datos al cliente.)
import { NextRequest, NextResponse } from 'next/server';
import { reenviarAlGateway } from '@/lib/gatewayProxy';
import { cabecerasIpCliente } from '@/lib/ipCliente';

export async function GET(request: NextRequest) {
  const limite = request.nextUrl.searchParams.get('limite') ?? '100';

  try {
    const respuestaGateway = await reenviarAlGateway(
      `/publico/anuncios?limite=${encodeURIComponent(limite)}`,
      { method: 'GET', headers: cabecerasIpCliente(request) }
    );
    const data = await respuestaGateway.json().catch(() => []);
    return NextResponse.json(data, { status: respuestaGateway.status });
  } catch {
    return NextResponse.json({ error: 'No se pudo conectar con el servidor' }, { status: 503 });
  }
}