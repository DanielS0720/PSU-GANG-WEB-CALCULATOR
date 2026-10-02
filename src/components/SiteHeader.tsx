import Image from "next/image";
import Link from "next/link";

// Shared header — centered PSU Gang logo linking back to the calculator.
export function SiteHeader() {
  return (
    <header className="border-b border-[var(--color-surface)]">
      <div className="mx-auto w-full max-w-3xl px-6 py-5 flex items-center justify-center">
        <Link href="/" aria-label="PSU Gang — Watt Calculator">
          <Image
            src="/logo/empresarial-logo.png"
            alt="PSU Gang"
            width={4000}
            height={1004}
            priority
            className="h-20 w-auto"
          />
        </Link>
      </div>
    </header>
  );
}
