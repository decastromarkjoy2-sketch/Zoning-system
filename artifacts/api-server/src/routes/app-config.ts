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

function toResponse(config: typeof appConfigTable.$inferSelect) {
  return {
    app_name: config.appName,
    division_name: config.divisionName,
    municipality_name: config.municipalityName,
    regulatory_reference: config.regulatoryReference,
  };
}

router.get("/app-config", async (req, res): Promise<void> => {
  const config = await getOrCreateConfig();
  res.json(toResponse(config));
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

  const { app_name, division_name, municipality_name, regulatory_reference } = req.body as {
    app_name?: string;
    division_name?: string;
    municipality_name?: string;
    regulatory_reference?: string;
  };

  const config = await getOrCreateConfig();

  const updates: {
    appName?: string;
    divisionName?: string;
    municipalityName?: string;
    regulatoryReference?: string;
  } = {};
  if (typeof app_name === "string") updates.appName = app_name.trim() || "Municipal Zoning Information System";
  if (typeof division_name === "string") updates.divisionName = division_name.trim() || "LGU Planning Division";
  if (typeof municipality_name === "string") updates.municipalityName = municipality_name.trim() || "Municipality of Tago";
  if (typeof regulatory_reference === "string") updates.regulatoryReference = regulatory_reference.trim() || "Annex A HLURB Memo. Cr. No. 003 Series of 1985";

  const [updated] = await db
    .update(appConfigTable)
    .set(updates)
    .where(eq(appConfigTable.id, config.id))
    .returning();

  res.json(toResponse(updated));
});

export default router;
