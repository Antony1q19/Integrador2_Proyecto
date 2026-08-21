import { empresasMock } from "@/features/empresas/data/mock_empresas";
import { EmpresasView } from "@/features/empresas/components/EmpresasView";

export default function EmpresasPage() {
  const empresas = empresasMock; // Aquí puedes reemplazar con la lógica para obtener las empresas desde tu API o base de datos

  return <EmpresasView empresas={empresas} />;
}
