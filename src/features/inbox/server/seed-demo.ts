"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth0 } from "@/lib/auth0";

/**
 * Inserts a lightweight seed project for an empty-state CTA.
 * Safe to call repeatedly: uses a stable id.
 */
export async function seedDemoProject() {
  const session = await auth0.getSession();
  if (!session?.user?.sub) throw new Error("not authenticated");

  const user = await prisma.user.upsert({
    where: { auth0Sub: session.user.sub },
    create: {
      auth0Sub: session.user.sub,
      email: session.user.email ?? `${session.user.sub}@unknown.local`,
      name: session.user.name ?? null,
    },
    update: {},
  });

  await prisma.project.upsert({
    where: { id: "seeded-empty-state" },
    create: {
      id: "seeded-empty-state",
      name: "Demo Project (seeded from empty state)",
      description: "Auto-created to demo the inbox flow.",
      areaSqm: 240,
      ownerId: user.id,
      responsibleApproverName: "Ing. Demo Approver",
      responsibleApproverRole: "Structural Engineer",
    },
    update: {},
  });

  revalidatePath("/app");
}
