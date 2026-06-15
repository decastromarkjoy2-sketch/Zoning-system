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
    or_no: r.orNo ?? null,
    date_of_payment: r.dateOfPayment ? r.dateOfPayment.toISOString() : null,
    corporation_name: r.corporationName ?? null,
    corporation_address: r.corporationAddress ?? null,
    authorized_rep_name: r.authorizedRepName ?? null,
    authorized_rep_address: r.authorizedRepAddress ?? null,
    project_type: r.projectType ?? null,
    project_nature: r.projectNature ?? null,
    floor_area: r.floorArea != null ? Number(r.floorArea) : null,
    right_over_land: r.rightOverLand ?? null,
    project_tenure: r.projectTenure ?? null,
    tct_tdn: r.tctTdn ?? null,
    project_cost: r.projectCost != null ? Number(r.projectCost) : null,
    release_mode: r.releaseMode ?? null,
    amount_paid: r.amountPaid != null ? Number(r.amountPaid) : null,
    date_issued: r.dateIssued ? r.dateIssued.toISOString() : null,
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

  const d = parsed.data;
  const [record] = await db
    .insert(zoningRecordsTable)
    .values({
      referenceNumber: generateRef(),
      ownerName: d.owner_name,
      ownerContact: d.owner_contact ?? null,
      barangay: d.barangay,
      address: d.address,
      zoneType: d.zone_type as any,
      landArea: d.land_area?.toString() ?? null,
      gpsLat: d.gps_lat?.toString() ?? null,
      gpsLng: d.gps_lng?.toString() ?? null,
      notes: d.notes ?? null,
      orNo: d.or_no ?? null,
      dateOfPayment: d.date_of_payment ? new Date(d.date_of_payment) : null,
      corporationName: d.corporation_name ?? null,
      corporationAddress: d.corporation_address ?? null,
      authorizedRepName: d.authorized_rep_name ?? null,
      authorizedRepAddress: d.authorized_rep_address ?? null,
      projectType: d.project_type ?? null,
      projectNature: d.project_nature ?? null,
      floorArea: d.floor_area?.toString() ?? null,
      rightOverLand: d.right_over_land ?? null,
      projectTenure: d.project_tenure ?? null,
      tctTdn: d.tct_tdn ?? null,
      projectCost: d.project_cost?.toString() ?? null,
      releaseMode: d.release_mode ?? null,
      amountPaid: d.amount_paid?.toString() ?? null,
      dateIssued: d.date_issued ? new Date(d.date_issued) : null,
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

  const d = parsed.data;
  const updateData: Partial<typeof zoningRecordsTable.$inferInsert> = {};
  if (d.owner_name !== undefined) updateData.ownerName = d.owner_name;
  if (d.owner_contact !== undefined) updateData.ownerContact = d.owner_contact;
  if (d.barangay !== undefined) updateData.barangay = d.barangay;
  if (d.address !== undefined) updateData.address = d.address;
  if (d.zone_type !== undefined) updateData.zoneType = d.zone_type as any;
  if (d.status !== undefined) updateData.status = d.status as any;
  if (d.land_area !== undefined) updateData.landArea = d.land_area?.toString();
  if (d.gps_lat !== undefined) updateData.gpsLat = d.gps_lat?.toString();
  if (d.gps_lng !== undefined) updateData.gpsLng = d.gps_lng?.toString();
  if (d.notes !== undefined) updateData.notes = d.notes;
  if (d.or_no !== undefined) updateData.orNo = d.or_no;
  if (d.date_of_payment !== undefined) updateData.dateOfPayment = d.date_of_payment ? new Date(d.date_of_payment) : null;
  if (d.corporation_name !== undefined) updateData.corporationName = d.corporation_name;
  if (d.corporation_address !== undefined) updateData.corporationAddress = d.corporation_address;
  if (d.authorized_rep_name !== undefined) updateData.authorizedRepName = d.authorized_rep_name;
  if (d.authorized_rep_address !== undefined) updateData.authorizedRepAddress = d.authorized_rep_address;
  if (d.project_type !== undefined) updateData.projectType = d.project_type;
  if (d.project_nature !== undefined) updateData.projectNature = d.project_nature;
  if (d.floor_area !== undefined) updateData.floorArea = d.floor_area?.toString();
  if (d.right_over_land !== undefined) updateData.rightOverLand = d.right_over_land;
  if (d.project_tenure !== undefined) updateData.projectTenure = d.project_tenure;
  if (d.tct_tdn !== undefined) updateData.tctTdn = d.tct_tdn;
  if (d.project_cost !== undefined) updateData.projectCost = d.project_cost?.toString();
  if (d.release_mode !== undefined) updateData.releaseMode = d.release_mode;
  if (d.amount_paid !== undefined) updateData.amountPaid = d.amount_paid?.toString();
  if (d.date_issued !== undefined) updateData.dateIssued = d.date_issued ? new Date(d.date_issued) : null;

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
