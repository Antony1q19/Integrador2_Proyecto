// app/api/comunicaciones/plantillas-rapidas/route.ts
//   GET → los textos del botón "Plantillas" del chat
import { NextRequest } from "next/server";
import { reenviarPeticion } from "@/lib/proxyJson";

export const GET = (request: NextRequest) => reenviarPeticion(request, "/comunicaciones/plantillas-rapidas");
