import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const include = {
  bomItems: { include: { material: true } },
  audits: {
    orderBy: { startedAt: "desc" as const },
    take: 1,
    include: {
      suggestions: {
        orderBy: { kgCo2eSaved: "desc" as const },
        include: {
          originalItem: { include: { material: true } },
          approval: { include: { user: true } },
        },
      },
    },
  },
} satisfies Prisma.ProjectInclude;

export type ProjectWithDetail = Prisma.ProjectGetPayload<{ include: typeof include }>;

export async function loadProjectDetail(projectId: string): Promise<ProjectWithDetail | null> {
  return prisma.project.findUnique({ where: { id: projectId }, include });
}
