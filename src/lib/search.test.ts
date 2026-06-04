import { describe, it, expect } from "vitest";
import { matches, normalize } from "./search";

describe("normalize", () => {
  it("lowercases and strips accents", () => {
    expect(normalize("ÁRC Battlemage")).toBe("arc battlemage");
  });
  it("collapses surrounding and inner whitespace", () => {
    expect(normalize("  RTX   50 ")).toBe("rtx 50");
  });
});

describe("matches", () => {
  // searchText is built as `brand model family` (see CpuPicker/GpuPicker).
  const rtx5090 = "Nvidia RTX 5090 RTX 50";
  const rtx5080 = "Nvidia RTX 5080 RTX 50";
  const rtx4090 = "Nvidia RTX 4090 RTX 40";
  const rtx3050 = "Nvidia RTX 3050 RTX 30";
  const ryzen7700 = "AMD Ryzen 7 7700 Zen 4";

  it("RTX 50 matches the 50-series", () => {
    expect(matches(rtx5090, "RTX 50")).toBe(true);
    expect(matches(rtx5080, "RTX 50")).toBe(true);
  });
  it("RTX 50 excludes other series (the core requirement)", () => {
    expect(matches(rtx4090, "RTX 50")).toBe(false);
    expect(matches(rtx3050, "RTX 50")).toBe(false);
  });
  it("matches by model number fragment", () => {
    expect(matches(ryzen7700, "7700")).toBe(true);
  });
  it("matches a query spanning brand into model (brand+model adjacency)", () => {
    expect(matches(ryzen7700, "AMD Ryzen")).toBe(true);
    expect(matches("Nvidia RTX 2060 RTX 20", "RTX 2060")).toBe(true);
  });
  it("a tier query excludes other tiers", () => {
    const r5 = "AMD Ryzen 5 5600X Zen 3";
    const r7 = "AMD Ryzen 7 5800X Zen 3";
    const r9 = "AMD Ryzen 9 5900X Zen 3";
    expect(matches(r5, "AMD Ryzen 5")).toBe(true);
    expect(matches(r7, "AMD Ryzen 5")).toBe(false);
    expect(matches(r9, "AMD Ryzen 5")).toBe(false);
  });
  it("is case- and accent-insensitive", () => {
    expect(matches("AMD ÁRC", "arc")).toBe(true);
    expect(matches(rtx5090, "rtx 50")).toBe(true);
  });
  it("empty or whitespace query matches everything", () => {
    expect(matches(rtx4090, "")).toBe(true);
    expect(matches(rtx4090, "   ")).toBe(true);
  });
  it("blank searchText does not match a non-empty query", () => {
    expect(matches("", "rtx")).toBe(false);
  });
});
