import { cookies } from "next/headers";
import { empresasMock } from "@/features/empresas/data/mock_empresas";
import { EmpresasView } from "@/features/empresas/components/EmpresasView";

export default async function EmpresasPage() {
  // Las cookies "userRole"/"userEmpresas" las pone loginform.tsx al
  // loguear (ver features/login/sesion/authService.ts -> login()); un
  // Admin ve todas las empresas, RRHH/Supervisor solo las que un Admin
  // les haya asignado en /perfil -> "Gestión de Trabajadores".
  const almacenCookies = await cookies();
  const rol = almacenCookies.get("userRole")?.value;

  let empresas = empresasMock;
  if (rol !== "Admin") {
    let idsVisibles: number[] = [];
    try {
      idsVisibles = JSON.parse(almacenCookies.get("userEmpresas")?.value ?? "[]");
    } catch {
      idsVisibles = [];
    }
    empresas = empresasMock.filter((empresa) => idsVisibles.includes(empresa.id));
  }

  return <EmpresasView empresas={empresas} />;
}
