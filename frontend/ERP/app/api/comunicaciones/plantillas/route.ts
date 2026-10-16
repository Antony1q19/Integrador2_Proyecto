// app/api/comunicaciones/plantillas/route.ts
//   GET  /api/comunicaciones/plantillas → plantillas de WhatsApp de la cuenta (con su estado en Meta)
//   POST /api/comunicaciones/plantillas → crear una plantilla y mandarla a revisión de Meta
import { NextRequest } from "next/server";
import { reenviarPeticion } from "@/lib/proxyJson";

export const GET = (request: NextRequest) => reenviarPeticion(request, "/comunicaciones/plantillas");
export const POST = (request: NextRequest) => reenviarPeticion(request, "/comunicaciones/plantillas");
