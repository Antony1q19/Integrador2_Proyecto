// app/api/entrevistas/route.ts
//   GET  /api/entrevistas?postulanteId=&anuncioId=&estado=&desde=&hasta=  → entrevistas (agenda / historial)
//   POST /api/entrevistas                                                 → programar una entrevista
import { NextRequest } from "next/server";
import { reenviarPeticion } from "@/lib/proxyJson";

export const GET = (request: NextRequest) => reenviarPeticion(request, `/entrevistas${request.nextUrl.search}`);
export const POST = (request: NextRequest) => reenviarPeticion(request, "/entrevistas");
