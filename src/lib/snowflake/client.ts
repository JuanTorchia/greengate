/**
 * Snowflake client wrapper for reading emission factors.
 *
 * Expected table (loaded from ICE Database v3.0):
 *   EMISSION_FACTORS (
 *     MATERIAL_CODE    TEXT PRIMARY KEY,
 *     MATERIAL_NAME    TEXT NOT NULL,
 *     CATEGORY         TEXT NOT NULL,
 *     UNIT             TEXT NOT NULL,
 *     KG_CO2E_PER_UNIT NUMBER(18, 6) NOT NULL,
 *     SOURCE           TEXT NOT NULL,
 *     VERSION          TEXT NOT NULL
 *   );
 *
 * VERIFY: snowflake-sdk Node.js driver API
 *   https://docs.snowflake.com/developer-guide/node-js/nodejs-driver
 */

import type { EmissionFactor, EmissionsSource } from "@/lib/emissions/types";

export interface SnowflakeConfig {
  account: string;
  username: string;
  password: string;
  warehouse: string;
  database: string;
  schema: string;
  role: string;
}

export function getSnowflakeConfig(): SnowflakeConfig {
  throw new Error("not implemented");
}

export function createSnowflakeEmissionsSource(_config: SnowflakeConfig): EmissionsSource {
  throw new Error("not implemented");
}

export async function queryEmissionFactors(
  _materialCodes: string[],
): Promise<EmissionFactor[]> {
  throw new Error("not implemented");
}

export async function queryLowerCarbonAlternatives(
  _category: string,
  _currentKgCo2ePerUnit: number,
  _limit: number,
): Promise<EmissionFactor[]> {
  throw new Error("not implemented");
}
