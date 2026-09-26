import { SkeletonListado } from "@/components/shared/Skeleton";

// Se muestra al instante al cambiar de pantalla, mientras llega la página (cualquier ruta del panel sin
// esqueleto propio usa este).
export default function Loading() {
  return <SkeletonListado />;
}
