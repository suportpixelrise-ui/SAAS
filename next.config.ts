import type { NextConfig } from "next";

// Site estático: `next build` gera a pasta out/, que vira o zip do Netlify.
// Tudo que precisa de servidor está nas Firebase Functions (pasta functions/).
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
