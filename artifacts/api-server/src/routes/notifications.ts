import { Router, type IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { ListNotificationsQueryParams, MarkNotificationReadParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/notifications", async (req, res): Promise<void> => {
  const params = ListNotificationsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];
  if (params.data.unread_only) {
    conditions.push(eq(notificationsTable.isRead, false));
  }

  const rows = conditions.length
    ? await db.select().from(notificationsTable).where(and(...conditions)).orderBy(desc(notificationsTable.createdAt)).limit(50)
    : await db.select().from(notificationsTable).orderBy(desc(notificationsTable.createdAt)).limit(50);

  res.json(
    rows.map((n) => ({
      id: n.id,
      user_id: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      is_read: n.isRead,
      related_id: n.relatedId ?? null,
      created_at: n.createdAt.toISOString(),
    }))
  );
});

router.post("/notifications/:id/read", async (req, res): Promise<void> => {
  const params = MarkNotificationReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [notification] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.id, params.data.id))
    .returning();

  if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json({
    id: notification.id,
    user_id: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    is_read: notification.isRead,
    related_id: notification.relatedId ?? null,
    created_at: notification.createdAt.toISOString(),
  });
});

export default router;
