// features/perfil/types/usuario.ts
export type RolInterno = "Admin" | "RRHH" | "Supervisor";
export type EstadoUsuario = "Activo" | "Suspendido" | "Eliminado";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: RolInterno;
  estado: EstadoUsuario;
  empresasVisibles: number[];
  fechaCreacion: string;
}

// Solo la trae la respuesta de crear/restablecer contraseña, nunca el listado.
export interface UsuarioCreado extends Usuario {
  passwordTemporal: string;
}

export interface UsuarioFormData {
  nombre: string;
  email: string;
  rol: RolInterno;
  empresasVisibles: number[];
}
