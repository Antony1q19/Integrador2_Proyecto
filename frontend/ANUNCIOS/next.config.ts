import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fija la raíz del proyecto: hay package-lock.json en carpetas superiores
  // y Turbopack podría tomar otra carpeta como raíz y no encontrar node_modules.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
