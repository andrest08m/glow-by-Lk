import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Las fotos de celular pesan varios MB; el límite por defecto (1MB) hacía
      // fallar la subida. Permitimos hasta 50MB por acción (varias fotos juntas).
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;

// Habilita el acceso a los bindings de Cloudflare durante `next dev` (igual que Alerta Violeta).
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
