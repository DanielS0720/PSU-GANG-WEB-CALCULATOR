"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CalculationResult } from "@/lib/calculator";
import { Calculator } from "./Calculator";
import { FeaturedPsus } from "./FeaturedPsus";

interface ResultScopeProps {
  /** The project-support link, defined in the page and rendered above the
   *  featured PSUs section. */
  supportSlot: ReactNode;
}

// Owns the calculation result so the featured PSUs section can live below the
// support link (outside Calculator) while Calculator keeps the result internally
// for its own cards. Auto-scrolls to the featured section once a tiered result
// is available.
export function ResultScope({ supportSlot }: ResultScopeProps) {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const featuredRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result?.tier) {
      featuredRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  return (
    <>
      <Calculator onResult={setResult} />

      {supportSlot}

      <div ref={featuredRef}>
        {result && result.tier && <FeaturedPsus result={result} />}
      </div>
    </>
  );
}
