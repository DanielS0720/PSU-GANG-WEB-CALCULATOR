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
  const rtx5090 = "Nvidia RTX 50 RTX 5090";
  const rtx5080 = "Nvidia RTX 50 RTX 5080";
  const rtx4090 = "Nvidia RTX 40 RTX 4090";
  const rtx3050 = "Nvidia RTX 30 RTX 3050";
  const ryzen7700 = "AMD Zen 4 Ryzen 7 7700";

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
