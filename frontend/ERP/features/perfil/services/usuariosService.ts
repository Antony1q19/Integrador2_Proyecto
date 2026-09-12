// features/perfil/services/usuariosService.ts
//
// Llama a las rutas propias del ERP (app/api/usuarios/**), nunca al
// Gateway directo -mismo patrón que postulantesService.ts-. Sin modo
// mock: esta pantalla siempre habla con el backend real.
import { RolInterno, Usuario, UsuarioCreado, UsuarioFormData } from "../types/usuario";

async function leerJsonOFallar<T>(res: Response, mensajeError: string): Promise<T> {
  if (!res.ok) {
    const cuerpo = await res.json().catch(() => null);
    throw new Error(cuerpo?.detail ?? cuerpo?.error ?? mensajeError);
  }
  return res.json();
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const res = await fetch("/api/usuarios");
  return leerJsonOFallar(res, "No se pudo cargar la lista de trabajadores");
}

export async function crearUsuario(datos: UsuarioFormData): Promise<UsuarioCreado> {
  const res = await fetch("/api/usuarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  return leerJsonOFallar(res, "No se pudo crear el trabajador");
}

export async function actualizarUsuario(
  id: string,
  datos: Partial<Pick<UsuarioFormData, "nombre" | "rol" | "empresasVisibles">>
): Promise<Usuario> {
  const res = await fetch(`/api/usuarios/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  return leerJsonOFallar(res, "No se pudo actualizar el trabajador");
}

export async function restablecerPassword(id: string): Promise<UsuarioCreado> {
  const res = await fetch(`/api/usuarios/${id}/restablecer-password`, { method: "POST" });
  return leerJsonOFallar(res, "No se pudo restablecer la contraseña");
}

export async function cambiarEstadoUsuario(
  id: string,
  estado: Usuario["estado"]
): Promise<Usuario> {
  const res = await fetch(`/api/usuarios/${id}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado }),
  });
  return leerJsonOFallar(res, "No se pudo cambiar el estado");
}

export async function cambiarMiPassword(passwordActual: string, passwordNuevo: string): Promise<void> {
  const res = await fetch("/api/usuarios/me/password", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passwordActual, passwordNuevo }),
  });
  if (!res.ok) {
    const cuerpo = await res.json().catch(() => null);
    throw new Error(cuerpo?.detail ?? "No se pudo cambiar la contraseña");
  }
}

export const ROLES_INTERNOS: RolInterno[] = ["Admin", "RRHH", "Supervisor"];
