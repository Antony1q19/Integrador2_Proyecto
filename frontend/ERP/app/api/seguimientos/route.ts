// app/api/seguimientos/route.ts
//   GET  /api/seguimientos?postulanteId=&contratacionId=&estado=&soloVencidos=  → controles post-ingreso
//   POST /api/seguimientos                                                      → agregar un control adicional
import { NextRequest } from "next/server";
import { reenviarPeticion } from "@/lib/proxyJson";

export const GET = (request: NextRequest) => reenviarPeticion(request, `/seguimientos${request.nextUrl.search}`);
export const POST = (request: NextRequest) => reenviarPeticion(request, "/seguimientos");
