/**
 * Local mock emissions source for dev before Snowflake is wired.
 * Reads factors from src/lib/emissions/mock-data.json (not committed with
 * real values — see mock-data.json for the loading instructions).
 */

import type { EmissionFactor, EmissionsSource } from "@/lib/emissions/types";

export function createMockEmissionsSource(): EmissionsSource {
  throw new Error("not implemented");
}

export async function queryEmissionFactorsMock(
  _materialCodes: string[],
): Promise<EmissionFactor[]> {
  throw new Error("not implemented");
}

export async function queryLowerCarbonAlternativesMock(
  _category: string,
  _currentKgCo2ePerUnit: number,
  _limit: number,
): Promise<EmissionFactor[]> {
  throw new Error("not implemented");
}
