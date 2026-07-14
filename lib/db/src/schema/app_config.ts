import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const appConfigTable = pgTable("app_config", {
  id: serial("id").primaryKey(),
  appName: text("app_name").notNull().default("Municipal Zoning Information System"),
  divisionName: text("division_name").notNull().default("LGU Planning Division"),
  municipalityName: text("municipality_name").notNull().default("Municipality of Tago"),
  regulatoryReference: text("regulatory_reference").notNull().default("Annex A HLURB Memo. Cr. No. 003 Series of 1985"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertAppConfigSchema = createInsertSchema(appConfigTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertAppConfig = z.infer<typeof insertAppConfigSchema>;
export type AppConfig = typeof appConfigTable.$inferSelect;
