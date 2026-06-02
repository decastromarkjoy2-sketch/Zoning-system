import { Router, type IRouter } from "express";
import { db, auditLogsTable, usersTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { ListAuditLogsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/audit-logs", async (req, res): Promise<void> => {
  const params = ListAuditLogsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const limit = params.data.limit ?? 50;
  const page = params.data.page ?? 1;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (params.data.user_id) conditions.push(eq(auditLogsTable.userId, params.data.user_id));
  if (params.data.entity_type) conditions.push(eq(auditLogsTable.entityType, params.data.entity_type));
  if (params.data.entity_id) conditions.push(eq(auditLogsTable.entityId, params.data.entity_id));

  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(auditLogsTable)
    .where(where)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean) as number[])];
  let userMap: Record<number, string> = {};
  if (userIds.length > 0) {
    const allUsers = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable);
    userMap = Object.fromEntries(allUsers.filter(u => userIds.includes(u.id)).map((u) => [u.id, u.name]));
  }

  res.json(
    rows.map((r) => ({
      id: r.id,
      user_id: r.userId ?? null,
      user_name: r.userId ? (userMap[r.userId] ?? null) : null,
      action: r.action,
      entity_type: r.entityType,
      entity_id: r.entityId ?? null,
      changes: r.changes ?? null,
      ip_address: r.ipAddress ?? null,
      created_at: r.createdAt.toISOString(),
    }))
  );
});

export default router;
