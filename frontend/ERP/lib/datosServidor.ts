// lib/datosServidor.ts
//
// Para las páginas que se dibujan en el SERVIDOR (Server Components): piden datos al Gateway con el
// JWT de la cookie httpOnly "authToken". El Gateway ya devuelve solo lo que ese usuario puede ver
// (por ejemplo, RRHH y Supervisor únicamente ven las empresas que un Admin les asignó).
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { reenviarAlGateway } from "@/lib/gatewayProxy";

// Devuelve el JSON de la ruta, o `null` si no existe / no se puede ver (404).
// Si no hay sesión (o venció), manda al login.
export async function obtenerDelGateway<T>(ruta: string): Promise<T | null> {
  const token = (await cookies()).get("authToken")?.value;
  if (!token) redirect("/login");

  const respuesta = await reenviarAlGateway(token, ruta);
  if (respuesta.status === 401) redirect("/login");
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new Error(`No se pudo cargar los datos (${respuesta.status})`);
  return (await respuesta.json()) as T;
}
