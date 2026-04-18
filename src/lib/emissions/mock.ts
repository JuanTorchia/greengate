/**
 * Local mock emissions source. Reads from src/lib/emissions/mock-data.json.
 * Values are derived from ICE Database v3.0 (Circular Ecology). See the
 * `__note` field at the top of the JSON.
 */

import { z } from "zod";
import mockData from "@/lib/emissions/mock-data.json";
import {
  EmissionFactorSchema,
  type EmissionFactor,
  type EmissionsSource,
} from "@/lib/emissions/types";

const MockFileSchema = z.object({
  source: z.string().min(1),
  version: z.string().min(1),
  factors: z.array(
    z.object({
      materialCode: z.string().min(1),
      materialName: z.string().min(1),
      category: z.string().min(1),
      unit: z.string().min(1),
      kgCo2ePerUnit: z.number().nonnegative(),
    }),
  ),
});

let cache: EmissionFactor[] | null = null;

function load(): EmissionFactor[] {
  if (cache) return cache;
  const parsed = MockFileSchema.parse(mockData);
  cache = parsed.factors.map((f) =>
    EmissionFactorSchema.parse({
      ...f,
      source: parsed.source,
      version: parsed.version,
    }),
  );
  return cache;
}

export function createMockEmissionsSource(): EmissionsSource {
  const all = load();
  return {
    async queryByMaterialCodes(codes: string[]): Promise<EmissionFactor[]> {
      const set = new Set(codes);
      return all.filter((f) => set.has(f.materialCode));
    },
    async queryLowerCarbonAlternatives(
      category: string,
      currentKgCo2ePerUnit: number,
      limit: number,
    ): Promise<EmissionFactor[]> {
      return all
        .filter(
          (f) => f.category === category && f.kgCo2ePerUnit < currentKgCo2ePerUnit,
        )
        .sort((a, b) => a.kgCo2ePerUnit - b.kgCo2ePerUnit)
        .slice(0, limit);
    },
  };
}
