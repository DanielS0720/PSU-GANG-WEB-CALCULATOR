import { ResultScope } from "@/components/ResultScope";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  SOCIAL_URLS,
} from "@/lib/site";

// Structured data — helps search engines render a rich result for the tool.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "UtilityApplication",
  operatingSystem: "Web",
  browserRequirements: "Requires JavaScript",
  inLanguage: "es",
  isAccessibleForFree: true,
  featureList: [
    "Cálculo de consumo eléctrico por componentes (CPU, GPU, motherboard, disipador, ventiladores)",
    "Soporte de estándares ATX 2.52 (pico transitorio) y ATX 3.x (TDP)",
    "Soporte multi-GPU con suma de cargas",
    "Asignación de tier de fuente por letras (X a F)",
    "Fuente de poder recomendada por escalones estándar con tolerancia del 5%",
    "Aviso de fuentes que requieren instalación 220V/230V",
  ],
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: {
    "@type": "Organization",
    name: "PSU Gang",
    url: SITE_URL,
    sameAs: SOCIAL_URLS,
  },
};

// === Enlaces oficiales — reemplazar "#" por las URLs reales de PSU Gang ===
const SUPPORT_URL = "https://buymeacoffee.com/psugang?l=es";

export default function Home() {
  return (
    <div className="min-h-dvh flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-6 py-10">
          <h1 className="text-2xl font-semibold mb-1">
            Watt Calculator
          </h1>
          <p className="text-sm text-[var(--color-muted)] mb-8">
            Selecciona tus componentes y obtén la potencia de fuente recomendada.
          </p>
          <ResultScope
            supportSlot={
              <div className="mt-10 text-center">
                <a
                  href={SUPPORT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-[var(--color-accent)] underline underline-offset-4 hover:opacity-80"
                >
                  ¿Gustas apoyar el proyecto? Haz click aquí
                </a>
              </div>
            }
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
