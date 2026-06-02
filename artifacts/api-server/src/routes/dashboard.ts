import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  zoningRecordsTable,
  auditLogsTable,
  usersTable,
  syncLogsTable,
  notificationsTable,
} from "@workspace/db";
import { sql, count, eq, desc, gte } from "drizzle-orm";

const router: IRouter = Router();

const ZONE_COLORS: Record<string, string> = {
  residential: "#3B82F6",
  commercial: "#F59E0B",
  industrial: "#6B7280",
  agricultural: "#10B981",
  institutional: "#8B5CF6",
  protected_area: "#06B6D4",
  mixed_use: "#92400E",
};

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const [totals] = await db
    .select({
      total: count(),
      approved: sql<number>`count(*) filter (where ${zoningRecordsTable.status} = 'approved')`,
      pending: sql<number>`count(*) filter (where ${zoningRecordsTable.status} = 'pending')`,
      rejected: sql<number>`count(*) filter (where ${zoningRecordsTable.status} = 'rejected')`,
      under_review: sql<number>`count(*) filter (where ${zoningRecordsTable.status} = 'under_review')`,
    })
    .from(zoningRecordsTable);

  const [syncTotal] = await db
    .select({ total: count() })
    .from(syncLogsTable)
    .where(eq(syncLogsTable.status, "success"));

  const [lastSync] = await db
    .select({ completedAt: syncLogsTable.completedAt })
    .from(syncLogsTable)
    .where(eq(syncLogsTable.status, "success"))
    .orderBy(desc(syncLogsTable.completedAt))
    .limit(1);

  const [unreadCount] = await db
    .select({ cnt: count() })
    .from(notificationsTable)
    .where(eq(notificationsTable.isRead, false));

  res.json({
    total_records: Number(totals?.total ?? 0),
    approved_records: Number(totals?.approved ?? 0),
    pending_validations: Number(totals?.pending ?? 0),
    rejected_records: Number(totals?.rejected ?? 0),
    under_review: Number(totals?.under_review ?? 0),
    total_synced: Number(syncTotal?.total ?? 0),
    last_sync: lastSync?.completedAt?.toISOString() ?? null,
    unread_notifications: Number(unreadCount?.cnt ?? 0),
  });
});

router.get("/dashboard/zone-distribution", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      zone_type: zoningRecordsTable.zoneType,
      count: count(),
    })
    .from(zoningRecordsTable)
    .groupBy(zoningRecordsTable.zoneType);

  const result = rows.map((r) => ({
    zone_type: r.zone_type,
    count: Number(r.count),
    color: ZONE_COLORS[r.zone_type] ?? "#94A3B8",
  }));

  res.json(result);
});

router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const logs = await db
    .select({
      id: auditLogsTable.id,
      action: auditLogsTable.action,
      entity_type: auditLogsTable.entityType,
      entity_id: auditLogsTable.entityId,
      user_id: auditLogsTable.userId,
      created_at: auditLogsTable.createdAt,
    })
    .from(auditLogsTable)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(20);

  const userIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean) as number[])];
  let userMap: Record<number, string> = {};
  if (userIds.length > 0) {
    const users = await db
      .select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(sql`${usersTable.id} = ANY(${sql.raw(`ARRAY[${userIds.join(",")}]`)})`);
    userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));
  }

  const result = logs.map((l) => ({
    id: l.id,
    action: l.action,
    entity_type: l.entity_type,
    entity_id: l.entity_id,
    description: `${l.action} ${l.entity_type}${l.entity_id ? ` #${l.entity_id}` : ""}`,
    user_name: l.user_id ? (userMap[l.user_id] ?? "Unknown") : "System",
    created_at: l.created_at.toISOString(),
  }));

  res.json(result);
});

router.get("/dashboard/sync-stats", async (req, res): Promise<void> => {
  const [totals] = await db
    .select({
      total: count(),
      success: sql<number>`count(*) filter (where ${syncLogsTable.status} = 'success')`,
      failed: sql<number>`count(*) filter (where ${syncLogsTable.status} = 'failed')`,
    })
    .from(syncLogsTable);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [todayCount] = await db
    .select({ cnt: sql<number>`coalesce(sum(${syncLogsTable.recordsSynced}::int), 0)` })
    .from(syncLogsTable)
    .where(gte(syncLogsTable.startedAt, today));

  const [lastLog] = await db
    .select({
      status: syncLogsTable.status,
      completedAt: syncLogsTable.completedAt,
    })
    .from(syncLogsTable)
    .orderBy(desc(syncLogsTable.startedAt))
    .limit(1);

  res.json({
    total_syncs: Number(totals?.total ?? 0),
    successful_syncs: Number(totals?.success ?? 0),
    failed_syncs: Number(totals?.failed ?? 0),
    records_synced_today: Number(todayCount?.cnt ?? 0),
    last_sync_status: lastLog?.status ?? null,
    last_sync_at: lastLog?.completedAt?.toISOString() ?? null,
  });
});

export default router;
