import { Calculator } from "@/components/Calculator";

export default function Home() {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-[var(--color-surface)]">
        <div className="mx-auto w-full max-w-3xl px-6 py-5 flex items-center">
          {/* Logo placeholder — reemplazar por /public/logo/psu-gang-logo.svg cuando Daniel lo entregue */}
          <div
            className="h-8 w-32 rounded-sm border border-[var(--color-accent)] flex items-center justify-center font-mono text-xs tracking-widest text-[var(--color-accent)]"
            aria-label="PSU Gang"
          >
            PSU&nbsp;GANG
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-6 py-10">
          <h1 className="font-mono text-2xl font-semibold mb-1">
            Watt Calculator
          </h1>
          <p className="text-sm text-[var(--color-muted)] mb-8">
            Selecciona tus componentes y obtén la potencia de fuente recomendada.
          </p>
          <Calculator />
        </div>
      </main>

      <footer className="border-t border-[var(--color-surface)]">
        <div className="mx-auto w-full max-w-3xl px-6 py-4 text-xs text-[var(--color-muted)] font-mono">
          PSU Gang — sitio temporal
        </div>
      </footer>
    </div>
  );
}
