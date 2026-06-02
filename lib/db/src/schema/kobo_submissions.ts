import { pgTable, text, serial, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const koboSubmissionsTable = pgTable("kobo_submissions", {
  id: serial("id").primaryKey(),
  submissionId: text("submission_id").notNull().unique(),
  formId: text("form_id").notNull(),
  data: jsonb("data").notNull(),
  processed: boolean("processed").notNull().default(false),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertKoboSubmissionSchema = createInsertSchema(
  koboSubmissionsTable
).omit({ id: true, syncedAt: true });
export type InsertKoboSubmission = z.infer<typeof insertKoboSubmissionSchema>;
export type KoboSubmission = typeof koboSubmissionsTable.$inferSelect;

export const syncLogsTable = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  status: text("status", {
    enum: ["success", "failed", "in_progress"],
  }).notNull(),
  recordsSynced: text("records_synced").notNull().default("0"),
  duplicatesSkipped: text("duplicates_skipped").notNull().default("0"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertSyncLogSchema = createInsertSchema(syncLogsTable).omit({
  id: true,
  startedAt: true,
});
export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;
export type SyncLog = typeof syncLogsTable.$inferSelect;

export const koboConfigTable = pgTable("kobo_config", {
  id: serial("id").primaryKey(),
  apiUrl: text("api_url").notNull().default("https://kf.kobotoolbox.org"),
  apiToken: text("api_token"),
  formId: text("form_id").notNull().default(""),
  syncIntervalMinutes: text("sync_interval_minutes").notNull().default("5"),
  lastSync: timestamp("last_sync", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertKoboConfigSchema = createInsertSchema(koboConfigTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertKoboConfig = z.infer<typeof insertKoboConfigSchema>;
export type KoboConfig = typeof koboConfigTable.$inferSelect;
