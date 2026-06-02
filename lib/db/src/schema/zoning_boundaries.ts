import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const zoningBoundariesTable = pgTable("zoning_boundaries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  zoneType: text("zone_type", {
    enum: [
      "residential",
      "commercial",
      "industrial",
      "agricultural",
      "institutional",
      "protected_area",
      "mixed_use",
    ],
  }).notNull(),
  geojson: jsonb("geojson").notNull(),
  color: text("color"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertZoningBoundarySchema = createInsertSchema(
  zoningBoundariesTable
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertZoningBoundary = z.infer<typeof insertZoningBoundarySchema>;
export type ZoningBoundary = typeof zoningBoundariesTable.$inferSelect;
