import { describe, it, expect } from "vitest";
import en from "@/messages/en.json";
import si from "@/messages/si.json";

function getKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      keys.push(...getKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

describe("i18n translation files", () => {
  const enKeys = getKeys(en).sort();
  const siKeys = getKeys(si).sort();

  it("en.json and si.json have the same top-level namespaces", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(si).sort());
  });

  it("en.json and si.json have the same keys", () => {
    const missingInSi = enKeys.filter((k) => !siKeys.includes(k));
    const missingInEn = siKeys.filter((k) => !enKeys.includes(k));

    expect(missingInSi).toEqual([]);
    expect(missingInEn).toEqual([]);
  });

  it("no empty string values in en.json", () => {
    const emptyKeys = enKeys.filter((key) => {
      const parts = key.split(".");
      let val: unknown = en;
      for (const p of parts) val = (val as Record<string, unknown>)[p];
      return val === "";
    });
    expect(emptyKeys).toEqual([]);
  });

  it("no empty string values in si.json", () => {
    const emptyKeys = siKeys.filter((key) => {
      const parts = key.split(".");
      let val: unknown = si;
      for (const p of parts) val = (val as Record<string, unknown>)[p];
      return val === "";
    });
    expect(emptyKeys).toEqual([]);
  });
});
