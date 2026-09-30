// app/api/contrataciones/route.ts
//   GET  /api/contrataciones?postulanteId=&anuncioId=&estado=  → contrataciones (cada una con sus seguimientos)
//   POST /api/contrataciones                                   → registrar una contratación (marca la postulación "Contratado")
import { NextRequest } from "next/server";
import { reenviarPeticion } from "@/lib/proxyJson";

export const GET = (request: NextRequest) => reenviarPeticion(request, `/contrataciones${request.nextUrl.search}`);
export const POST = (request: NextRequest) => reenviarPeticion(request, "/contrataciones");
