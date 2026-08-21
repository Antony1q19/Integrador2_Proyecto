import EmpresasFicha from "@/features/empresas/components/EmpresasFicha";

export default function EmpresaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <EmpresasFicha params={params} />;
}

