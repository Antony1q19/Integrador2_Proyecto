import type { Metadata } from "next";
import { PostulantesPipeline } from "@/features/postulantes/components/PostulantesPipeline";

export const metadata: Metadata = { title: "Pipeline de selección" };

export default function PipelinePage() {
  return <PostulantesPipeline />;
}
