import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const approvalsTable = pgTable("approvals", {
  id: serial("id").primaryKey(),
  recordId: integer("record_id").notNull(),
  reviewerId: integer("reviewer_id"),
  submittedBy: integer("submitted_by").notNull(),
  status: text("status", {
    enum: ["pending", "under_review", "approved", "rejected"],
  })
    .notNull()
    .default("pending"),
  comment: text("comment"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertApprovalSchema = createInsertSchema(approvalsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertApproval = z.infer<typeof insertApprovalSchema>;
export type Approval = typeof approvalsTable.$inferSelect;
