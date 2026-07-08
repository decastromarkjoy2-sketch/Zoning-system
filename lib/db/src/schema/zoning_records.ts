import {
  pgTable,
  text,
  serial,
  timestamp,
  numeric,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const zoningRecordsTable = pgTable("zoning_records", {
  id: serial("id").primaryKey(),
  referenceNumber: text("reference_number").notNull().unique(),
  ownerName: text("owner_name").notNull(),
  ownerContact: text("owner_contact"),
  barangay: text("barangay").notNull(),
  address: text("address").notNull(),
  zoneType: text("zone_type", {
    enum: [
      "residential",
      "commercial",
      "industrial",
      "agricultural",
      "institutional",
      "protected_area",
      "mixed_use",
      "forest",
      "parks_recreational",
      "open_space",
    ],
  }).notNull(),
  status: text("status", {
    enum: ["pending", "under_review", "approved", "rejected"],
  })
    .notNull()
    .default("pending"),
  landArea: numeric("land_area", { precision: 12, scale: 2 }),
  gpsLat: numeric("gps_lat", { precision: 10, scale: 7 }),
  gpsLng: numeric("gps_lng", { precision: 10, scale: 7 }),
  notes: text("notes"),
  koboSubmissionId: text("kobo_submission_id"),
  createdBy: integer("created_by"),

  orNo: text("or_no"),
  dateOfPayment: timestamp("date_of_payment", { withTimezone: true }),
  corporationName: text("corporation_name"),
  corporationAddress: text("corporation_address"),
  authorizedRepName: text("authorized_rep_name"),
  authorizedRepAddress: text("authorized_rep_address"),
  projectType: text("project_type"),
  projectNature: text("project_nature"),
  floorArea: numeric("floor_area", { precision: 12, scale: 2 }),
  rightOverLand: text("right_over_land"),
  projectTenure: text("project_tenure"),
  tctTdn: text("tct_tdn"),
  projectCost: numeric("project_cost", { precision: 15, scale: 2 }),
  releaseMode: text("release_mode"),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }),
  dateIssued: timestamp("date_issued", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertZoningRecordSchema = createInsertSchema(
  zoningRecordsTable
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertZoningRecord = z.infer<typeof insertZoningRecordSchema>;
export type ZoningRecord = typeof zoningRecordsTable.$inferSelect;
