import type { NextConfig } from "next";

// Export estático: el sitio es 100% prerenderizado. Genera /out con HTML+assets,
// que se despliega como Workers static assets en Cloudflare (wrangler deploy).
// Las cabeceras de seguridad viven en public/_headers (headers() no se soporta
// con output: "export").
const nextConfig: NextConfig = {
  output: "export",
  // Cloudflare no usa el optimizador de imágenes de Next; servir PNG tal cual.
  images: { unoptimized: true },
};

export default nextConfig;
