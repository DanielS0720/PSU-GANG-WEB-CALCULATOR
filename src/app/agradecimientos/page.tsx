import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_NAME } from "@/lib/site";

const DESCRIPTION =
  "Agradecimientos de PSU Gang a los reviewers y laboratorios de fuentes de poder que sirven de referencia para el proyecto.";

export const metadata: Metadata = {
  title: "Agradecimientos",
  description: DESCRIPTION,
  alternates: { canonical: "/agradecimientos" },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "/agradecimientos",
    siteName: SITE_NAME,
    title: "Agradecimientos",
    description: DESCRIPTION,
  },
};

// Imágenes en public/agradecimientos/. `href` opcional: sin él la tarjeta no es link.
const THANKS: { name: string; image: string; href?: string }[] = [
  {
    name: "Aris Mpitziopoulos",
    image: "/agradecimientos/aris-avatar.jpg",
  },
  {
    name: "Igor's Lab",
    image: "/agradecimientos/igors-lab.jpg",
    href: "https://www.igorslab.de/en/",
  },
  {
    name: "Hardware Busters",
    image: "/agradecimientos/hardware-busters.jpg",
    href: "https://hwbusters.com/",
  },
  {
    name: "TechPowerUp",
    image: "/agradecimientos/techpowerup.jpg",
    href: "https://www.techpowerup.com/",
  },
  {
    name: "F14lab",
    image: "/agradecimientos/f14-lab.jpg",
    href: "https://www.f14lab.org/",
  },
  {
    name: "Tom's Hardware",
    image: "/agradecimientos/toms-hardware.jpg",
    href: "https://www.tomshardware.com/",
  },
];

const CARD_CLASS =
  "w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc((100%-2rem)/3)] rounded-lg border border-[var(--color-surface)] p-4 text-center";

function ThanksCardBody({ name, image, href }: (typeof THANKS)[number]) {
  return (
    <>
      <div className="relative mx-auto mb-3 aspect-square w-full max-w-[160px] overflow-hidden rounded-md bg-[var(--color-surface)]">
        <Image
          src={image}
          alt={name}
          width={160}
          height={160}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <h2 className="text-sm font-semibold text-[var(--color-text)]">{name}</h2>
      {href ? (
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {new URL(href).hostname.replace(/^www\./, "")}
        </p>
      ) : null}
    </>
  );
}

export default function Agradecimientos() {
  return (
    <div className="min-h-dvh flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-4xl px-6 py-10">
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--color-accent)] underline-offset-4 hover:underline"
          >
            ← Volver a la calculadora
          </Link>

          <h1 className="mt-6 text-2xl font-semibold mb-1">Agradecimientos</h1>
          <p className="text-sm text-[var(--color-muted)] mb-8">
            A quienes, con su trabajo de análisis y medición de fuentes de poder,
            sirven de referencia para este proyecto.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            {THANKS.map((t) =>
              t.href ? (
                <a
                  key={t.name}
                  href={t.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${CARD_CLASS} transition hover:border-[var(--color-accent)]`}
                >
                  <ThanksCardBody {...t} />
                </a>
              ) : (
                <article key={t.name} className={CARD_CLASS}>
                  <ThanksCardBody {...t} />
                </article>
              ),
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
