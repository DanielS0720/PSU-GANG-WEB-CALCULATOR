import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_SHORT_NAME, SITE_DESCRIPTION } from "@/lib/site";

// Necesario con output: "export".
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#141414",
    theme_color: "#141414",
    lang: "es",
    categories: ["utilities", "productivity"],
  };
}
