import { Router, type IRouter } from "express";
import { db, zoningRecordsTable, auditLogsTable } from "@workspace/db";
import { eq, ilike, or, and, sql, count } from "drizzle-orm";
import {
  CreateZoningRecordBody,
  GetZoningRecordParams,
  UpdateZoningRecordParams,
  UpdateZoningRecordBody,
  DeleteZoningRecordParams,
  ListZoningRecordsQueryParams,
  GetMapRecordsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function recordToResponse(r: typeof zoningRecordsTable.$inferSelect) {
  return {
    id: r.id,
    reference_number: r.referenceNumber,
    owner_name: r.ownerName,
    owner_contact: r.ownerContact ?? null,
    barangay: r.barangay,
    address: r.address,
    zone_type: r.zoneType,
    status: r.status,
    land_area: r.landArea != null ? Number(r.landArea) : null,
    gps_lat: r.gpsLat != null ? Number(r.gpsLat) : null,
    gps_lng: r.gpsLng != null ? Number(r.gpsLng) : null,
    notes: r.notes ?? null,
    kobo_submission_id: r.koboSubmissionId ?? null,
    created_by: r.createdBy ?? null,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  };
}

function generateRef(): string {
  const now = new Date();
  const year = now.getFullYear();
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `ZRN-${year}-${rand}`;
}

router.get("/zoning-records/map", async (req, res): Promise<void> => {
  const params = GetMapRecordsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [
    sql`${zoningRecordsTable.gpsLat} IS NOT NULL`,
    sql`${zoningRecordsTable.gpsLng} IS NOT NULL`,
  ];

  if (params.data.zone_type)
    conditions.push(eq(zoningRecordsTable.zoneType, params.data.zone_type as any));
  if (params.data.status)
    conditions.push(eq(zoningRecordsTable.status, params.data.status as any));
  if (params.data.barangay)
    conditions.push(ilike(zoningRecordsTable.barangay, `%${params.data.barangay}%`));

  const rows = await db
    .select()
    .from(zoningRecordsTable)
    .where(and(...conditions));

  res.json(
    rows.map((r) => ({
      id: r.id,
      reference_number: r.referenceNumber,
      owner_name: r.ownerName,
      barangay: r.barangay,
      zone_type: r.zoneType,
      status: r.status,
      gps_lat: Number(r.gpsLat),
      gps_lng: Number(r.gpsLng),
    }))
  );
});

router.get("/zoning-records", async (req, res): Promise<void> => {
  const params = ListZoningRecordsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const page = params.data.page ?? 1;
  const limit = params.data.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (params.data.status)
    conditions.push(eq(zoningRecordsTable.status, params.data.status as any));
  if (params.data.zone_type)
    conditions.push(eq(zoningRecordsTable.zoneType, params.data.zone_type as any));
  if (params.data.barangay)
    conditions.push(ilike(zoningRecordsTable.barangay, `%${params.data.barangay}%`));
  if (params.data.search) {
    conditions.push(
      or(
        ilike(zoningRecordsTable.ownerName, `%${params.data.search}%`),
        ilike(zoningRecordsTable.barangay, `%${params.data.search}%`),
        ilike(zoningRecordsTable.referenceNumber, `%${params.data.search}%`)
      )
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ cnt: count() })
    .from(zoningRecordsTable)
    .where(where);

  const rows = await db
    .select()
    .from(zoningRecordsTable)
    .where(where)
    .orderBy(zoningRecordsTable.createdAt)
    .limit(limit)
    .offset(offset);

  res.json({
    data: rows.map(recordToResponse),
    total: Number(totalRow?.cnt ?? 0),
    page,
    limit,
  });
});

router.post("/zoning-records", async (req, res): Promise<void> => {
  const parsed = CreateZoningRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [record] = await db
    .insert(zoningRecordsTable)
    .values({
      referenceNumber: generateRef(),
      ownerName: parsed.data.owner_name,
      ownerContact: parsed.data.owner_contact ?? null,
      barangay: parsed.data.barangay,
      address: parsed.data.address,
      zoneType: parsed.data.zone_type as any,
      landArea: parsed.data.land_area?.toString() ?? null,
      gpsLat: parsed.data.gps_lat?.toString() ?? null,
      gpsLng: parsed.data.gps_lng?.toString() ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  await db.insert(auditLogsTable).values({
    action: "create",
    entityType: "zoning_record",
    entityId: record.id,
    changes: { reference_number: record.referenceNumber, zone_type: record.zoneType },
    ipAddress: req.ip,
  });

  res.status(201).json(recordToResponse(record));
});

router.get("/zoning-records/:id", async (req, res): Promise<void> => {
  const params = GetZoningRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [record] = await db
    .select()
    .from(zoningRecordsTable)
    .where(eq(zoningRecordsTable.id, params.data.id));

  if (!record) {
    res.status(404).json({ error: "Zoning record not found" });
    return;
  }

  res.json(recordToResponse(record));
});

router.patch("/zoning-records/:id", async (req, res): Promise<void> => {
  const params = UpdateZoningRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateZoningRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<typeof zoningRecordsTable.$inferInsert> = {};
  if (parsed.data.owner_name !== undefined) updateData.ownerName = parsed.data.owner_name;
  if (parsed.data.owner_contact !== undefined) updateData.ownerContact = parsed.data.owner_contact;
  if (parsed.data.barangay !== undefined) updateData.barangay = parsed.data.barangay;
  if (parsed.data.address !== undefined) updateData.address = parsed.data.address;
  if (parsed.data.zone_type !== undefined) updateData.zoneType = parsed.data.zone_type as any;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status as any;
  if (parsed.data.land_area !== undefined) updateData.landArea = parsed.data.land_area?.toString();
  if (parsed.data.gps_lat !== undefined) updateData.gpsLat = parsed.data.gps_lat?.toString();
  if (parsed.data.gps_lng !== undefined) updateData.gpsLng = parsed.data.gps_lng?.toString();
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

  const [record] = await db
    .update(zoningRecordsTable)
    .set(updateData)
    .where(eq(zoningRecordsTable.id, params.data.id))
    .returning();

  if (!record) {
    res.status(404).json({ error: "Zoning record not found" });
    return;
  }

  await db.insert(auditLogsTable).values({
    action: "update",
    entityType: "zoning_record",
    entityId: record.id,
    changes: parsed.data,
    ipAddress: req.ip,
  });

  res.json(recordToResponse(record));
});

router.delete("/zoning-records/:id", async (req, res): Promise<void> => {
  const params = DeleteZoningRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [record] = await db
    .delete(zoningRecordsTable)
    .where(eq(zoningRecordsTable.id, params.data.id))
    .returning();

  if (!record) {
    res.status(404).json({ error: "Zoning record not found" });
    return;
  }

  await db.insert(auditLogsTable).values({
    action: "delete",
    entityType: "zoning_record",
    entityId: params.data.id,
    ipAddress: req.ip,
  });

  res.sendStatus(204);
});

export default router;
