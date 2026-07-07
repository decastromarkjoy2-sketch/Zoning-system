import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { appConfigTable } from "@workspace/db/schema";

const router = Router();

async function getOrCreateConfig() {
  const [existing] = await db.select().from(appConfigTable).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(appConfigTable).values({}).returning();
  return created;
}

router.get("/app-config", async (req, res): Promise<void> => {
  const config = await getOrCreateConfig();
  res.json({ app_name: config.appName, division_name: config.divisionName });
});

router.patch("/app-config", async (req, res): Promise<void> => {
  const userId = req.session.userId;
  const userRole = req.session.userRole;

  if (!userId) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  if (userRole !== "administrator" && userRole !== "planning_officer") {
    res.status(403).json({ error: "Insufficient permissions." });
    return;
  }

  const { app_name, division_name } = req.body as { app_name?: string; division_name?: string };

  const config = await getOrCreateConfig();

  const updates: { appName?: string; divisionName?: string } = {};
  if (typeof app_name === "string") updates.appName = app_name.trim() || "Municipal Zoning Information System";
  if (typeof division_name === "string") updates.divisionName = division_name.trim() || "LGU Planning Division";

  const [updated] = await db
    .update(appConfigTable)
    .set(updates)
    .where(eq(appConfigTable.id, config.id))
    .returning();

  res.json({ app_name: updated.appName, division_name: updated.divisionName });
});

export default router;
