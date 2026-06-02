import { Router, type IRouter } from "express";
import { db, zoningBoundariesTable, auditLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateZoningBoundaryBody,
  UpdateZoningBoundaryParams,
  UpdateZoningBoundaryBody,
  DeleteZoningBoundaryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function boundaryToResponse(b: typeof zoningBoundariesTable.$inferSelect) {
  return {
    id: b.id,
    name: b.name,
    zone_type: b.zoneType,
    geojson: b.geojson,
    color: b.color ?? null,
    description: b.description ?? null,
    created_at: b.createdAt.toISOString(),
  };
}

router.get("/zoning-boundaries", async (req, res): Promise<void> => {
  const rows = await db.select().from(zoningBoundariesTable);
  res.json(rows.map(boundaryToResponse));
});

router.post("/zoning-boundaries", async (req, res): Promise<void> => {
  const parsed = CreateZoningBoundaryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [boundary] = await db
    .insert(zoningBoundariesTable)
    .values({
      name: parsed.data.name,
      zoneType: parsed.data.zone_type as any,
      geojson: parsed.data.geojson,
      color: parsed.data.color ?? null,
      description: parsed.data.description ?? null,
    })
    .returning();

  await db.insert(auditLogsTable).values({
    action: "create",
    entityType: "zoning_boundary",
    entityId: boundary.id,
    changes: { name: boundary.name, zone_type: boundary.zoneType },
    ipAddress: req.ip,
  });

  res.status(201).json(boundaryToResponse(boundary));
});

router.patch("/zoning-boundaries/:id", async (req, res): Promise<void> => {
  const params = UpdateZoningBoundaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateZoningBoundaryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<typeof zoningBoundariesTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.zone_type !== undefined) updateData.zoneType = parsed.data.zone_type as any;
  if (parsed.data.geojson !== undefined) updateData.geojson = parsed.data.geojson;
  if (parsed.data.color !== undefined) updateData.color = parsed.data.color;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;

  const [boundary] = await db
    .update(zoningBoundariesTable)
    .set(updateData)
    .where(eq(zoningBoundariesTable.id, params.data.id))
    .returning();

  if (!boundary) {
    res.status(404).json({ error: "Boundary not found" });
    return;
  }

  res.json(boundaryToResponse(boundary));
});

router.delete("/zoning-boundaries/:id", async (req, res): Promise<void> => {
  const params = DeleteZoningBoundaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [boundary] = await db
    .delete(zoningBoundariesTable)
    .where(eq(zoningBoundariesTable.id, params.data.id))
    .returning();

  if (!boundary) {
    res.status(404).json({ error: "Boundary not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
