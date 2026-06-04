import { describe, it, expect } from "vitest";
import { resolveStorage, fanRgb5v, coolerRgb5v } from "./calculator";
import type { Cooler, Fan } from "@/types/components";

describe("resolveStorage", () => {
  it("HDD on 12V: 2 units = 40W", () => {
    expect(resolveStorage({ unitId: "hdd", subtypeId: null, count: 2 })).toEqual({
      label: "HDD ×2",
      rail: "12v",
      watts: 40,
    });
  });

  it("SSD SATA on 5V: 1 unit = 8W", () => {
    expect(resolveStorage({ unitId: "ssd-sata", subtypeId: null, count: 1 })).toEqual({
      label: "SSD SATA ×1",
      rail: "5v",
      watts: 8,
    });
  });

  it("NVMe uses the selected subtype watts (PCIe 5.0 = 15W) on 3.3V", () => {
    expect(resolveStorage({ unitId: "nvme", subtypeId: "pcie5", count: 2 })).toEqual({
      label: "NVMe PCIe 5.0 ×2",
      rail: "3v3",
      watts: 30,
    });
  });

  it("returns null for empty/unresolved rows", () => {
    expect(resolveStorage({ unitId: null, subtypeId: null, count: 1 })).toBeNull();
    expect(resolveStorage({ unitId: "nvme", subtypeId: null, count: 1 })).toBeNull();
    expect(resolveStorage({ unitId: "hdd", subtypeId: null, count: 0 })).toBeNull();
  });

  it("clamps count to 8", () => {
    expect(resolveStorage({ unitId: "hdd", subtypeId: null, count: 99 })?.watts).toBe(160);
  });
});

describe("fanRgb5v / coolerRgb5v", () => {
  const rgbFan: Fan = { id: "120mm-rgb", label: "120mm RGB", w_per_unit: 3.44, rgb_5v: 5 };
  const plainFan: Fan = { id: "120mm-standard", label: "120mm", w_per_unit: 1.88 };
  const rgbAio: Cooler = { id: "aio-360-rgb", label: "AIO 360 RGB", type: "aio", w: 25.32, rgb_5v: 15 };
  const plainAio: Cooler = { id: "aio-360", label: "AIO 360", type: "aio", w: 20.49 };

  it("RGB fan: 6 units = 30W on 5V", () => {
    expect(fanRgb5v(rgbFan, 6)).toBe(30);
  });
  it("non-RGB fan contributes 0", () => {
    expect(fanRgb5v(plainFan, 6)).toBe(0);
    expect(fanRgb5v(undefined, 6)).toBe(0);
  });
  it("RGB cooler returns its rgb_5v; non-RGB returns 0", () => {
    expect(coolerRgb5v(rgbAio)).toBe(15);
    expect(coolerRgb5v(plainAio)).toBe(0);
    expect(coolerRgb5v(undefined)).toBe(0);
  });
});
