// Single source of truth for site-wide identity (SEO, OG, sitemap, JSON-LD).
//
// NEXT_PUBLIC_SITE_URL must be set to the real production origin in Vercel
// (Project → Settings → Environment Variables), e.g. https://psugang.com.
// The fallback below is only a placeholder for local/dev builds.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://psugang.com"
).replace(/\/$/, "");

export const SITE_NAME = "PSU Gang — Watt Calculator";
export const SITE_SHORT_NAME = "PSU Gang";

export const SITE_DESCRIPTION =
  "Calcula la potencia y la fuente de poder recomendada para tu PC gamer. Elige CPU, GPU, motherboard, disipador y ventiladores; soporta ATX 2.52 y ATX 3.x.";

// Official PSU Gang channels — used for JSON-LD `sameAs` entity linking.
export const SOCIAL_URLS = [
  "https://www.facebook.com/PSUG4ng",
  "https://www.instagram.com/psugangts/",
  "https://www.tiktok.com/@psugang",
  "https://www.youtube.com/@PSUGANG-bx5hn",
];
