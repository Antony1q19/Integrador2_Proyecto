import { PostulanteFicha } from "@/features/postulantes/components/PostulanteFicha";

export default async function PostulanteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PostulanteFicha id={id} />;
}
