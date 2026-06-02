import { Router, type IRouter } from "express";
import {
  db,
  approvalsTable,
  zoningRecordsTable,
  usersTable,
  notificationsTable,
  auditLogsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateApprovalBody,
  ListApprovalsQueryParams,
  ReviewApprovalParams,
  ReviewApprovalBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function approvalToResponse(a: typeof approvalsTable.$inferSelect) {
  const [record] = await db
    .select({ ref: zoningRecordsTable.referenceNumber })
    .from(zoningRecordsTable)
    .where(eq(zoningRecordsTable.id, a.recordId));

  const [submitter] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, a.submittedBy));

  let reviewerName: string | null = null;
  if (a.reviewerId) {
    const [reviewer] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, a.reviewerId));
    reviewerName = reviewer?.name ?? null;
  }

  return {
    id: a.id,
    record_id: a.recordId,
    reviewer_id: a.reviewerId ?? null,
    submitted_by: a.submittedBy,
    status: a.status,
    comment: a.comment ?? null,
    reviewer_name: reviewerName,
    submitter_name: submitter?.name ?? "Unknown",
    record_reference: record?.ref ?? `#${a.recordId}`,
    created_at: a.createdAt.toISOString(),
    reviewed_at: a.reviewedAt?.toISOString() ?? null,
  };
}

router.get("/approvals", async (req, res): Promise<void> => {
  const params = ListApprovalsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];
  if (params.data.status)
    conditions.push(eq(approvalsTable.status, params.data.status as any));
  if (params.data.record_id)
    conditions.push(eq(approvalsTable.recordId, params.data.record_id));

  const rows = conditions.length
    ? await db.select().from(approvalsTable).where(and(...conditions))
    : await db.select().from(approvalsTable);

  const results = await Promise.all(rows.map(approvalToResponse));
  res.json(results);
});

router.post("/approvals", async (req, res): Promise<void> => {
  const parsed = CreateApprovalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [approval] = await db
    .insert(approvalsTable)
    .values({
      recordId: parsed.data.record_id,
      submittedBy: parsed.data.submitted_by,
      comment: parsed.data.comment ?? null,
      status: "pending",
    })
    .returning();

  await db
    .update(zoningRecordsTable)
    .set({ status: "pending" })
    .where(eq(zoningRecordsTable.id, parsed.data.record_id));

  await db.insert(auditLogsTable).values({
    action: "submit_for_approval",
    entityType: "approval",
    entityId: approval.id,
    changes: { record_id: parsed.data.record_id },
  });

  const result = await approvalToResponse(approval);
  res.status(201).json(result);
});

router.post("/approvals/:id/review", async (req, res): Promise<void> => {
  const params = ReviewApprovalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = ReviewApprovalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(approvalsTable)
    .where(eq(approvalsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Approval not found" });
    return;
  }

  const [approval] = await db
    .update(approvalsTable)
    .set({
      status: parsed.data.status as any,
      reviewerId: parsed.data.reviewer_id,
      comment: parsed.data.comment ?? null,
      reviewedAt: new Date(),
    })
    .where(eq(approvalsTable.id, params.data.id))
    .returning();

  await db
    .update(zoningRecordsTable)
    .set({ status: parsed.data.status as any })
    .where(eq(zoningRecordsTable.id, existing.recordId));

  await db.insert(notificationsTable).values({
    userId: existing.submittedBy,
    type: "approval_update",
    title: `Record ${parsed.data.status === "approved" ? "Approved" : parsed.data.status === "rejected" ? "Rejected" : "Under Review"}`,
    message: `Your submission has been ${parsed.data.status}.${parsed.data.comment ? ` Comment: ${parsed.data.comment}` : ""}`,
    relatedId: approval.id,
  });

  await db.insert(auditLogsTable).values({
    action: `review_${parsed.data.status}`,
    entityType: "approval",
    entityId: approval.id,
    userId: parsed.data.reviewer_id,
    changes: { status: parsed.data.status, comment: parsed.data.comment },
  });

  const result = await approvalToResponse(approval);
  res.json(result);
});

export default router;
