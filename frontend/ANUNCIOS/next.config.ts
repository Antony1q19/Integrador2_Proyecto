import type { NextConfig } from "next";
import path from "path";

// Cabeceras de seguridad para TODAS las páginas y rutas /api:
//   - X-Frame-Options / frame-ancestors: nadie de otro sitio puede mostrar esta app dentro de un
//     <iframe> (clickjacking). SAMEORIGIN y no DENY: el visor de documentos usa un iframe propio.
//   - nosniff: el navegador respeta el tipo de archivo declarado.
//   - Referrer-Policy: no se filtra la URL completa (con ids) a otros sitios.
//   - Permissions-Policy: la app no usa cámara, micrófono ni ubicación.
const CABECERAS_DE_SEGURIDAD = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Fija la raíz del proyecto: hay package-lock.json en carpetas superiores
  // y Turbopack podría tomar otra carpeta como raíz y no encontrar node_modules.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // No anunciar "X-Powered-By: Next.js" (no regalar información del stack).
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: CABECERAS_DE_SEGURIDAD }];
  },
};

export default nextConfig;
