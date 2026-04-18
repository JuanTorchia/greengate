/**
 * Seed: one demo architect, three demo projects (Torre Núñez, Distrito Solar
 * Rosario, Centro Logístico Ezeiza). Each project owns its own BOM;
 * the first two also ship with a pre-seeded AuditRun + Suggestions (and
 * pre-approvals for Distrito Solar) so the inbox populates realistically.
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
  // --- Low-carbon alternatives (for suggestions) ---
  { code: "REBAR-EAF-10", name: "EAF-produced rebar ADN-420 10 mm", category: "steel", defaultUnit: "kg" },
  { code: "REBAR-EAF-12", name: "EAF-produced rebar ADN-420 12 mm", category: "steel", defaultUnit: "kg" },
  { code: "ALU-LOWCARBON", name: "Low-carbon aluminium (hydropower)", category: "openings", defaultUnit: "kg" },
  { code: "ALU-RECYCLED", name: "Recycled aluminium", category: "openings", defaultUnit: "kg" },
  { code: "CONC-C25-GGBS", name: "Ready-mix concrete C25/30 (50% GGBS)", category: "concrete", defaultUnit: "m3" },
  { code: "INSUL-WOODFIBRE", name: "Wood-fibre insulation board 50 mm", category: "insulation", defaultUnit: "m2" },
  { code: "GLASS-RECYCLED", name: "Low-embodied glazing (recycled float)", category: "openings", defaultUnit: "m2" },
];

interface ProjectSeed {
  id: string;
  slug: string;
  name: string;
  description: string;
  areaSqm: number;
  approverName: string;
  approverRole: string;
  boms: Array<{ code: string; qty: number; unit: string; notes?: string }>;
  audit?: {
    status: "COMPLETED";
    reviewStatus: "AWAITING_REVIEW" | "IN_REVIEW" | "CLEARED";
    totalKgCo2e: number;
    hotspotCount: number;
    slaHoursFromNow: number;
    suggestions: Array<{
      originalCode: string;
      proposedCode: string;
      proposedName: string;
      kgCo2eSaved: number;
      technicalRationale: string;
      riskNotes?: string;
      /** when set, create an Approval row with this decision + decidedAt = now - decidedMinutesAgo */
      preApproved?: { decidedMinutesAgo: number };
    }>;
  };
}

const projects: ProjectSeed[] = [
  {
    id: "proj-torre-nunez",
    slug: "torre-nunez",
    name: "Torre Núñez — Core & Shell",
    description: "Office tower, 24 stories. BOM v3.2. Shared by PM 14h ago.",
    areaSqm: 18400,
    approverName: "Ing. Martín Acosta",
    approverRole: "Structural Engineer",
    boms: [
      { code: "CONC-C25", qty: 840, unit: "m3", notes: "Core + slab" },
      { code: "CEM-I-42.5", qty: 6200, unit: "kg", notes: "Site mortar + finishes" },
      { code: "STEEL-REBAR-12", qty: 112000, unit: "kg", notes: "Core rebar" },
      { code: "STEEL-REBAR-10", qty: 38000, unit: "kg" },
      { code: "STEEL-REBAR-8", qty: 14000, unit: "kg" },
      { code: "WINDOW-ALU-DG", qty: 2400, unit: "m2", notes: "Curtain wall glazing" },
      { code: "ALU-LOWCARBON", qty: 28, unit: "kg", notes: "Placeholder for current aluminium frames" },
      { code: "INSUL-MINWOOL", qty: 3200, unit: "m2", notes: "Core insulation" },
      { code: "INSUL-EPS-50", qty: 640, unit: "m3" },
      { code: "ROOF-GALV", qty: 840, unit: "m2" },
      { code: "TILE-CERAMIC", qty: 1800, unit: "m2" },
      { code: "PLASTER-GYP", qty: 24000, unit: "kg" },
      { code: "PAINT-LATEX", qty: 980, unit: "L" },
      { code: "DOOR-STEEL-EXT", qty: 18, unit: "unit" },
      { code: "DOOR-WOOD", qty: 240, unit: "unit" },
      { code: "PIPE-PVC-110", qty: 720, unit: "m" },
      { code: "PIPE-PPR-25", qty: 2400, unit: "m" },
      { code: "WIRE-CU-2.5", qty: 14000, unit: "m" },
    ],
    audit: {
      status: "COMPLETED",
      reviewStatus: "AWAITING_REVIEW",
      totalKgCo2e: 184_320,
      hotspotCount: 4,
      slaHoursFromNow: 10,
      suggestions: [
        {
          originalCode: "CEM-I-42.5",
          proposedCode: "CEM-III-A",
          proposedName: "Blast-furnace slag cement CEM III/A",
          kgCo2eSaved: 9240,
          technicalRationale:
            "CEM III/A meets BS EN 197-1 CEM III class; same strength grade, broadly available. Cures slower in cold weather — verify placement schedule before approving.",
          riskNotes: "Cold-weather cure delay on pours below 10°C.",
        },
        {
          originalCode: "STEEL-REBAR-12",
          proposedCode: "REBAR-EAF-12",
          proposedName: "EAF-produced rebar ADN-420 12 mm",
          kgCo2eSaved: 3120,
          technicalRationale:
            "Electric-arc-furnace rebar with >90% recycled scrap. Same mechanical class (ADN-420). Requires mill certificate check.",
        },
        {
          originalCode: "WINDOW-ALU-DG",
          proposedCode: "GLASS-RECYCLED",
          proposedName: "Low-embodied glazing (recycled float)",
          kgCo2eSaved: 1610,
          technicalRationale:
            "Recycled float glass for curtain-wall units. Optical performance identical for SHGC/U-value specs.",
        },
        {
          originalCode: "ALU-LOWCARBON",
          proposedCode: "ALU-RECYCLED",
          proposedName: "Recycled aluminium",
          kgCo2eSaved: 850,
          technicalRationale:
            "100% recycled aluminium for extruded frame sections. No structural impact for curtain-wall mullions.",
        },
      ],
    },
  },
  {
    id: "proj-distrito-solar",
    slug: "distrito-solar",
    name: "Distrito Solar Rosario",
    description: "Residential, 4 towers. BOM v1.0. Shared by PM 2 days ago.",
    areaSqm: 42000,
    approverName: "Arq. Lucía Renaud",
    approverRole: "Architect of Record",
    boms: [
      { code: "CONC-C25", qty: 1240, unit: "m3" },
      { code: "STEEL-REBAR-12", qty: 84000, unit: "kg" },
      { code: "STEEL-REBAR-10", qty: 26000, unit: "kg" },
      { code: "BRICK-HOLLOW", qty: 180000, unit: "unit" },
      { code: "CEM-I-42.5", qty: 14000, unit: "kg" },
      { code: "INSUL-EPS-50", qty: 4800, unit: "m2" },
      { code: "WINDOW-PVC-DG", qty: 1800, unit: "m2" },
      { code: "ROOF-TILE-CLAY", qty: 18000, unit: "unit" },
      { code: "TILE-CERAMIC", qty: 12000, unit: "m2" },
      { code: "PAINT-LATEX", qty: 1400, unit: "L" },
      { code: "DOOR-WOOD", qty: 480, unit: "unit" },
      { code: "WIRE-CU-2.5", qty: 22000, unit: "m" },
    ],
    audit: {
      status: "COMPLETED",
      reviewStatus: "IN_REVIEW",
      totalKgCo2e: 312_400,
      hotspotCount: 3,
      slaHoursFromNow: 72,
      suggestions: [
        {
          originalCode: "STEEL-REBAR-12",
          proposedCode: "REBAR-EAF-12",
          proposedName: "EAF-produced rebar ADN-420 12 mm",
          kgCo2eSaved: 6200,
          technicalRationale: "EAF rebar for main structure; mill cert on file.",
          preApproved: { decidedMinutesAgo: 90 },
        },
        {
          originalCode: "CONC-C25",
          proposedCode: "CONC-C25-GGBS",
          proposedName: "Ready-mix concrete C25/30 (50% GGBS)",
          kgCo2eSaved: 2904,
          technicalRationale: "GGBS blend for non-structural pours. Compatible with standard curing.",
          preApproved: { decidedMinutesAgo: 60 },
        },
        {
          originalCode: "INSUL-EPS-50",
          proposedCode: "INSUL-WOODFIBRE",
          proposedName: "Wood-fibre insulation board 50 mm",
          kgCo2eSaved: 1420,
          technicalRationale: "Carbon-negative on a biogenic basis. Check fire rating per DPU.",
          riskNotes: "Verify hygrothermal performance in humid coastal wall assemblies.",
        },
      ],
    },
  },
  {
    id: "proj-ezeiza",
    slug: "centro-logistico-ezeiza",
    name: "Centro Logístico Ezeiza",
    description: "Industrial warehouse. BOM v2.1. Cleared 2 days ago.",
    areaSqm: 12400,
    approverName: "Ing. Rodrigo Salerno",
    approverRole: "Structural Engineer",
    boms: [
      { code: "CONC-C25", qty: 680, unit: "m3" },
      { code: "STEEL-REBAR-12", qty: 18000, unit: "kg" },
      { code: "ROOF-GALV", qty: 9800, unit: "m2" },
      { code: "CEM-I-42.5", qty: 3200, unit: "kg" },
      { code: "INSUL-MINWOOL", qty: 9800, unit: "m2" },
      { code: "DOOR-STEEL-EXT", qty: 8, unit: "unit" },
      { code: "PAINT-LATEX", qty: 420, unit: "L" },
      { code: "WIRE-CU-4", qty: 4800, unit: "m" },
    ],
    // No audit yet — lets the demo run SSE live from the inbox empty-audit card.
  },
];

async function main() {
  console.log("Seeding database...");

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@greengate.local" },
    update: {},
    create: {
      auth0Sub: "auth0|demo-user-placeholder",
      email: "demo@greengate.local",
      name: "Demo Sustainability Lead",
    },
  });

  for (const m of materials) {
    await prisma.material.upsert({
      where: { code: m.code },
      update: m,
      create: m,
    });
  }

  for (const p of projects) {
    const project = await prisma.project.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        description: p.description,
        areaSqm: p.areaSqm,
        responsibleApproverName: p.approverName,
        responsibleApproverRole: p.approverRole,
      },
      create: {
        id: p.id,
        name: p.name,
        description: p.description,
        areaSqm: p.areaSqm,
        responsibleApproverName: p.approverName,
        responsibleApproverRole: p.approverRole,
        ownerId: demoUser.id,
      },
    });

    await prisma.bomItem.deleteMany({ where: { projectId: project.id } });
    for (const item of p.boms) {
      const material = await prisma.material.findUniqueOrThrow({ where: { code: item.code } });
      await prisma.bomItem.create({
        data: {
          projectId: project.id,
          materialId: material.id,
          quantity: item.qty,
          unit: item.unit,
          notes: item.notes ?? null,
        },
      });
    }

    // Wipe previous synthetic audit for idempotency (keeps real CIBA-generated ones intact by id mismatch).
    await prisma.auditRun.deleteMany({
      where: { projectId: project.id, id: { startsWith: "seed-" } },
    });

    if (!p.audit) continue;

    const auditId = `seed-${p.slug}-audit`;
    const now = Date.now();
    const slaDueAt = new Date(now + p.audit.slaHoursFromNow * 60 * 60 * 1000);
    const startedAtReal = new Date(slaDueAt.getTime() - 48 * 60 * 60 * 1000);

    const audit = await prisma.auditRun.create({
      data: {
        id: auditId,
        projectId: project.id,
        status: "COMPLETED",
        reviewStatus: p.audit.reviewStatus,
        totalKgCo2e: p.audit.totalKgCo2e,
        hotspotCount: p.audit.hotspotCount,
        startedAt: startedAtReal,
        completedAt: startedAtReal,
        slaDueAt,
      },
    });

    let i = 0;
    for (const s of p.audit.suggestions) {
      i++;
      const originalItem = await prisma.bomItem.findFirstOrThrow({
        where: { projectId: project.id, material: { code: s.originalCode } },
      });
      const suggestion = await prisma.suggestion.create({
        data: {
          id: `seed-${p.slug}-sugg-${i}`,
          auditRunId: audit.id,
          originalItemId: originalItem.id,
          proposedMaterialCode: s.proposedCode,
          proposedMaterialName: s.proposedName,
          kgCo2eSaved: s.kgCo2eSaved,
          technicalRationale: s.technicalRationale,
          riskNotes: s.riskNotes ?? null,
          status: s.preApproved ? "APPROVED" : "PENDING",
        },
      });

      if (s.preApproved) {
        await prisma.approval.create({
          data: {
            suggestionId: suggestion.id,
            userId: demoUser.id,
            authReqId: `seed-${p.slug}-authreq-${i}`,
            decision: "APPROVED",
            decidedAt: new Date(now - s.preApproved.decidedMinutesAgo * 60 * 1000),
            rawResponse: { seeded: true } as unknown as object,
          },
        });
      }
    }
  }

  console.log(
    `Seeded ${materials.length} materials and ${projects.length} projects (plus audits + pre-approvals).`,
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
