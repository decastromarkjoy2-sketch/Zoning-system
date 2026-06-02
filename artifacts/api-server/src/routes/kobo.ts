import { Router, type IRouter } from "express";
import {
  db,
  koboSubmissionsTable,
  syncLogsTable,
  koboConfigTable,
  zoningRecordsTable,
  notificationsTable,
  auditLogsTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { UpdateKoboConfigBody, ListKoboSubmissionsQueryParams, ListSyncLogsQueryParams } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function getOrCreateConfig() {
  const [config] = await db.select().from(koboConfigTable).limit(1);
  if (config) return config;
  const [newConfig] = await db
    .insert(koboConfigTable)
    .values({ apiUrl: "https://kf.kobotoolbox.org", formId: "", syncIntervalMinutes: "5" })
    .returning();
  return newConfig;
}

router.post("/kobo/sync", async (req, res): Promise<void> => {
  const config = await getOrCreateConfig();

  if (!config.apiToken || !config.formId) {
    const [log] = await db
      .insert(syncLogsTable)
      .values({
        status: "failed",
        recordsSynced: "0",
        duplicatesSkipped: "0",
        errorMessage: "KoboToolbox not configured. Set API token and form ID first.",
        completedAt: new Date(),
      })
      .returning();

    res.json({
      success: false,
      records_synced: 0,
      duplicates_skipped: 0,
      errors: 1,
      message: "KoboToolbox not configured. Set API token and form ID first.",
    });
    return;
  }

  const [logEntry] = await db
    .insert(syncLogsTable)
    .values({ status: "in_progress", recordsSynced: "0", duplicatesSkipped: "0" })
    .returning();

  let recordsSynced = 0;
  let duplicatesSkipped = 0;
  let errorMessage: string | null = null;

  try {
    const apiUrl = `${config.apiUrl}/api/v2/assets/${config.formId}/data/?format=json`;
    const response = await fetch(apiUrl, {
      headers: { Authorization: `Token ${config.apiToken}` },
    });

    if (!response.ok) {
      throw new Error(`KoboToolbox API responded with ${response.status}`);
    }

    const data = await response.json() as { results?: any[] };
    const submissions = data.results ?? [];

    for (const sub of submissions) {
      const subId = String(sub._id ?? sub.id);
      const existing = await db
        .select()
        .from(koboSubmissionsTable)
        .where(eq(koboSubmissionsTable.submissionId, subId))
        .limit(1);

      if (existing.length > 0) {
        duplicatesSkipped++;
        continue;
      }

      await db.insert(koboSubmissionsTable).values({
        submissionId: subId,
        formId: config.formId,
        data: sub,
        processed: false,
      });

      const gpsRaw = sub._geolocation;
      const lat = Array.isArray(gpsRaw) ? gpsRaw[0] : null;
      const lng = Array.isArray(gpsRaw) ? gpsRaw[1] : null;

      const ownerName = sub.owner_name ?? sub["group_owner/name"] ?? "Unknown Owner";
      const barangay = sub.barangay ?? sub["group_location/barangay"] ?? "Unknown Barangay";
      const address = sub.address ?? sub["group_location/address"] ?? barangay;
      const zoneType = sub.zone_type ?? sub["group_zone/zone_type"] ?? "residential";

      await db.insert(zoningRecordsTable).values({
        referenceNumber: `KBS-${subId}`,
        ownerName,
        barangay,
        address,
        zoneType: zoneType as any,
        gpsLat: lat?.toString() ?? null,
        gpsLng: lng?.toString() ?? null,
        koboSubmissionId: subId,
      });

      recordsSynced++;
    }

    await db.update(koboConfigTable).set({ lastSync: new Date() }).where(eq(koboConfigTable.id, config.id));
    await db
      .update(syncLogsTable)
      .set({ status: "success", recordsSynced: String(recordsSynced), duplicatesSkipped: String(duplicatesSkipped), completedAt: new Date() })
      .where(eq(syncLogsTable.id, logEntry.id));

    await db.insert(auditLogsTable).values({
      action: "sync",
      entityType: "kobo_sync",
      changes: { records_synced: recordsSynced, duplicates_skipped: duplicatesSkipped },
    });

    if (recordsSynced > 0) {
      await db.insert(notificationsTable).values({
        userId: 1,
        type: "new_submission",
        title: "KoboToolbox Sync Complete",
        message: `${recordsSynced} new submission(s) synced from KoboToolbox.`,
        relatedId: logEntry.id,
      });
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "KoboToolbox sync failed");
    await db
      .update(syncLogsTable)
      .set({ status: "failed", errorMessage, completedAt: new Date() })
      .where(eq(syncLogsTable.id, logEntry.id));

    await db.insert(notificationsTable).values({
      userId: 1,
      type: "sync_failure",
      title: "KoboToolbox Sync Failed",
      message: `Sync failed: ${errorMessage}`,
      relatedId: logEntry.id,
    });
  }

  res.json({
    success: !errorMessage,
    records_synced: recordsSynced,
    duplicates_skipped: duplicatesSkipped,
    errors: errorMessage ? 1 : 0,
    message: errorMessage ?? `Successfully synced ${recordsSynced} records.`,
  });
});

router.get("/kobo/submissions", async (req, res): Promise<void> => {
  const params = ListKoboSubmissionsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const limit = params.data.limit ?? 50;
  const page = params.data.page ?? 1;
  const offset = (page - 1) * limit;

  const rows = await db
    .select()
    .from(koboSubmissionsTable)
    .orderBy(desc(koboSubmissionsTable.syncedAt))
    .limit(limit)
    .offset(offset);

  res.json(
    rows.map((r) => ({
      id: r.id,
      submission_id: r.submissionId,
      form_id: r.formId,
      data: r.data,
      synced_at: r.syncedAt.toISOString(),
      processed: r.processed,
    }))
  );
});

router.get("/kobo/sync-logs", async (req, res): Promise<void> => {
  const params = ListSyncLogsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const limit = params.data.limit ?? 20;
  const rows = await db
    .select()
    .from(syncLogsTable)
    .orderBy(desc(syncLogsTable.startedAt))
    .limit(limit);

  res.json(
    rows.map((r) => ({
      id: r.id,
      status: r.status,
      records_synced: Number(r.recordsSynced),
      duplicates_skipped: Number(r.duplicatesSkipped),
      error_message: r.errorMessage ?? null,
      started_at: r.startedAt.toISOString(),
      completed_at: r.completedAt?.toISOString() ?? null,
    }))
  );
});

router.get("/kobo/config", async (req, res): Promise<void> => {
  const config = await getOrCreateConfig();
  res.json({
    api_url: config.apiUrl,
    form_id: config.formId,
    is_configured: !!(config.apiToken && config.formId),
    sync_interval_minutes: Number(config.syncIntervalMinutes),
    last_sync: config.lastSync?.toISOString() ?? null,
  });
});

router.patch("/kobo/config", async (req, res): Promise<void> => {
  const parsed = UpdateKoboConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const config = await getOrCreateConfig();
  const updateData: Record<string, any> = {};
  if (parsed.data.api_url !== undefined) updateData.apiUrl = parsed.data.api_url;
  if (parsed.data.api_token !== undefined) updateData.apiToken = parsed.data.api_token;
  if (parsed.data.form_id !== undefined) updateData.formId = parsed.data.form_id;
  if (parsed.data.sync_interval_minutes !== undefined)
    updateData.syncIntervalMinutes = String(parsed.data.sync_interval_minutes);

  const [updated] = await db
    .update(koboConfigTable)
    .set(updateData)
    .where(eq(koboConfigTable.id, config.id))
    .returning();

  res.json({
    api_url: updated.apiUrl,
    form_id: updated.formId,
    is_configured: !!(updated.apiToken && updated.formId),
    sync_interval_minutes: Number(updated.syncIntervalMinutes),
    last_sync: updated.lastSync?.toISOString() ?? null,
  });
});

export default router;
