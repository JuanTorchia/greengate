import { z } from "zod";

export const EmissionFactorSchema = z.object({
  materialCode: z.string().min(1),
  materialName: z.string().min(1),
  category: z.string().min(1),
  unit: z.string().min(1),
  kgCo2ePerUnit: z.number().nonnegative(),
  source: z.string().min(1),
  version: z.string().min(1),
});

export type EmissionFactor = z.infer<typeof EmissionFactorSchema>;

export interface EmissionsSource {
  queryByMaterialCodes(codes: string[]): Promise<EmissionFactor[]>;
  queryLowerCarbonAlternatives(
    category: string,
    currentKgCo2ePerUnit: number,
    limit: number,
  ): Promise<EmissionFactor[]>;
}
