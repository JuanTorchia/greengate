/**
 * Seed: one demo architect, one demo project (80 sqm house, Buenos Aires),
 * ~30 realistic BOM items. Quantities are approximations — review before
 * the Sat 12:30 checkpoint.
 *
 * Emission factors are NOT seeded here. They live in Snowflake
 * (EMISSION_FACTORS) and must be loaded from the ICE Database v3.0.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface MaterialSeed {
  code: string;
  name: string;
  category: string;
  defaultUnit: string;
}

interface BomItemSeed {
  code: string;
  quantity: number;
  unit: string;
  notes?: string;
}

const materials: MaterialSeed[] = [
  { code: "CEM-I-42.5", name: "Portland Cement CEM I 42.5N", category: "binder", defaultUnit: "kg" },
  { code: "CEM-III-A", name: "Blast-furnace slag cement CEM III/A", category: "binder", defaultUnit: "kg" },
  { code: "SAND", name: "Construction sand", category: "aggregate", defaultUnit: "m3" },
  { code: "GRAVEL-20", name: "Gravel 20 mm", category: "aggregate", defaultUnit: "m3" },
  { code: "CONC-C25", name: "Ready-mix concrete C25/30", category: "concrete", defaultUnit: "m3" },
  { code: "BRICK-COMMON", name: "Common clay brick (6x12x25 cm)", category: "masonry", defaultUnit: "unit" },
  { code: "BRICK-HOLLOW", name: "Hollow clay brick (18-hole)", category: "masonry", defaultUnit: "unit" },
  { code: "BLOCK-CONC", name: "Concrete hollow block 20x20x40", category: "masonry", defaultUnit: "unit" },
  { code: "STEEL-REBAR-10", name: "Rebar ADN-420 10 mm", category: "steel", defaultUnit: "kg" },
  { code: "STEEL-REBAR-12", name: "Rebar ADN-420 12 mm", category: "steel", defaultUnit: "kg" },
  { code: "STEEL-REBAR-8", name: "Rebar ADN-420 8 mm", category: "steel", defaultUnit: "kg" },
  { code: "STEEL-WIRE", name: "Binding wire", category: "steel", defaultUnit: "kg" },
  { code: "MESH-Q188", name: "Welded steel mesh Q188", category: "steel", defaultUnit: "m2" },
  { code: "WOOD-PINE-FMW", name: "Pine lumber (formwork grade)", category: "wood", defaultUnit: "m3" },
  { code: "ROOF-GALV", name: "Galvanized steel sheet (corrugated)", category: "roofing", defaultUnit: "m2" },
  { code: "ROOF-TILE-CLAY", name: "Clay roof tile (French)", category: "roofing", defaultUnit: "unit" },
  { code: "INSUL-EPS-50", name: "EPS insulation board 50 mm", category: "insulation", defaultUnit: "m2" },
  { code: "INSUL-MINWOOL", name: "Mineral wool batt 50 mm", category: "insulation", defaultUnit: "m2" },
  { code: "PLASTER-GYP", name: "Gypsum plaster", category: "finishes", defaultUnit: "kg" },
  { code: "TILE-CERAMIC", name: "Ceramic floor tile 45x45", category: "finishes", defaultUnit: "m2" },
  { code: "PAINT-LATEX", name: "Interior latex paint", category: "finishes", defaultUnit: "L" },
  { code: "WIRE-CU-2.5", name: "Copper cable 2.5 mm² (PVC-insulated)", category: "electrical", defaultUnit: "m" },
  { code: "WIRE-CU-4", name: "Copper cable 4 mm² (PVC-insulated)", category: "electrical", defaultUnit: "m" },
  { code: "CONDUIT-PVC-20", name: "Corrugated PVC conduit 20 mm", category: "electrical", defaultUnit: "m" },
  { code: "PIPE-PVC-110", name: "PVC drainage pipe 110 mm", category: "plumbing", defaultUnit: "m" },
  { code: "PIPE-PPR-25", name: "PPR water pipe 25 mm", category: "plumbing", defaultUnit: "m" },
  { code: "WINDOW-ALU-DG", name: "Aluminium window frame, double glazing", category: "openings", defaultUnit: "m2" },
  { code: "WINDOW-PVC-DG", name: "PVC window frame, double glazing", category: "openings", defaultUnit: "m2" },
  { code: "DOOR-WOOD", name: "Solid wood interior door", category: "openings", defaultUnit: "unit" },
  { code: "DOOR-STEEL-EXT", name: "Steel exterior door", category: "openings", defaultUnit: "unit" },
];

const bomItems: BomItemSeed[] = [
  // Foundations
  { code: "CONC-C25", quantity: 22, unit: "m3", notes: "Footings + slab on grade" },
  { code: "STEEL-REBAR-12", quantity: 1200, unit: "kg", notes: "Main bars in footings" },
  { code: "STEEL-REBAR-8", quantity: 450, unit: "kg", notes: "Stirrups" },
  { code: "MESH-Q188", quantity: 80, unit: "m2", notes: "Slab mesh" },
  { code: "GRAVEL-20", quantity: 10, unit: "m3" },
  { code: "SAND", quantity: 8, unit: "m3" },
  // Walls
  { code: "BRICK-HOLLOW", quantity: 4200, unit: "unit", notes: "Exterior walls" },
  { code: "BRICK-COMMON", quantity: 1800, unit: "unit", notes: "Interior partitions" },
  { code: "CEM-I-42.5", quantity: 2800, unit: "kg", notes: "Masonry mortar binder" },
  { code: "SAND", quantity: 6, unit: "m3", notes: "Masonry mortar" },
  // Structure
  { code: "CONC-C25", quantity: 8, unit: "m3", notes: "Columns + beams" },
  { code: "STEEL-REBAR-10", quantity: 680, unit: "kg" },
  { code: "STEEL-REBAR-12", quantity: 420, unit: "kg" },
  { code: "STEEL-WIRE", quantity: 30, unit: "kg" },
  { code: "WOOD-PINE-FMW", quantity: 1.5, unit: "m3", notes: "Reusable formwork" },
  // Roof
  { code: "ROOF-GALV", quantity: 95, unit: "m2", notes: "Primary roof" },
  { code: "WOOD-PINE-FMW", quantity: 0.8, unit: "m3", notes: "Roof battens" },
  { code: "INSUL-MINWOOL", quantity: 90, unit: "m2", notes: "Roof insulation" },
  // Floors
  { code: "CONC-C25", quantity: 3, unit: "m3", notes: "Screed" },
  { code: "TILE-CERAMIC", quantity: 72, unit: "m2" },
  { code: "CEM-I-42.5", quantity: 350, unit: "kg", notes: "Tile adhesive base" },
  // Interior finishes
  { code: "PLASTER-GYP", quantity: 1100, unit: "kg", notes: "Interior wall plaster" },
  { code: "PAINT-LATEX", quantity: 45, unit: "L", notes: "Interior paint" },
  { code: "PAINT-LATEX", quantity: 18, unit: "L", notes: "Exterior paint" },
  { code: "INSUL-EPS-50", quantity: 140, unit: "m2", notes: "Exterior wall insulation" },
  // Openings
  { code: "WINDOW-ALU-DG", quantity: 14, unit: "m2", notes: "All windows" },
  { code: "DOOR-WOOD", quantity: 5, unit: "unit", notes: "Bedroom + bath doors" },
  { code: "DOOR-STEEL-EXT", quantity: 2, unit: "unit", notes: "Main + service" },
  // Electrical
  { code: "WIRE-CU-2.5", quantity: 320, unit: "m" },
  { code: "WIRE-CU-4", quantity: 80, unit: "m", notes: "Appliance circuits" },
  { code: "CONDUIT-PVC-20", quantity: 280, unit: "m" },
  // Plumbing
  { code: "PIPE-PVC-110", quantity: 35, unit: "m" },
  { code: "PIPE-PPR-25", quantity: 70, unit: "m" },
];

async function main() {
  console.log("Seeding database...");

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@greengate.local" },
    update: {},
    create: {
      auth0Sub: "auth0|demo-user-placeholder",
      email: "demo@greengate.local",
      name: "Demo Architect",
    },
  });

  for (const m of materials) {
    await prisma.material.upsert({
      where: { code: m.code },
      update: m,
      create: m,
    });
  }

  const project = await prisma.project.upsert({
    where: { id: "demo-project-01" },
    update: {},
    create: {
      id: "demo-project-01",
      name: "Casa 80 m² — Buenos Aires",
      description: "Single-story 80 sqm residential demo project.",
      areaSqm: 80,
      ownerId: demoUser.id,
    },
  });

  await prisma.bomItem.deleteMany({ where: { projectId: project.id } });

  for (const item of bomItems) {
    const material = await prisma.material.findUniqueOrThrow({
      where: { code: item.code },
    });
    await prisma.bomItem.create({
      data: {
        projectId: project.id,
        materialId: material.id,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes ?? null,
      },
    });
  }

  console.log(
    `Seeded ${materials.length} materials and ${bomItems.length} BOM items for project "${project.name}".`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
