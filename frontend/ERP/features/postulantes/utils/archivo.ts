// features/postulantes/utils/archivo.ts
//
// Descarga a la computadora el archivo de un documento. Se pide a `documento.url`
// (nuestro servidor, con la sesión) y se guarda con su nombre original. No se usa un
// enlace directo con `download` porque los navegadores lo ignoran cuando el archivo
// viene de otro sitio (como el Storage) y solo lo abrirían en una pestaña nueva.
import { DocumentoPostulante } from "../types/postulante.types";

export async function descargarArchivoDelDocumento(documento: DocumentoPostulante): Promise<void> {
  if (!documento.url) return;
  const res = await fetch(documento.url);
  if (!res.ok) throw new Error("No se pudo descargar el documento.");

  const urlLocal = URL.createObjectURL(await res.blob());
  const enlace = document.createElement("a");
  enlace.href = urlLocal;
  enlace.download = documento.nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(urlLocal);
}
