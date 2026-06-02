import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const ZONE_COLORS: Record<string, string> = {
  residential: "#3B82F6",
  commercial: "#F59E0B",
  industrial: "#6B7280",
  agricultural: "#10B981",
  institutional: "#8B5CF6",
  protected_area: "#06B6D4",
  mixed_use: "#92400E",
};

// GET /reports/barangay-summary
router.get("/reports/barangay-summary", async (req, res) => {
  const { zone_type, status } = req.query as Record<string, string>;

  const rows = await db.execute(sql`
    SELECT
      barangay,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'under_review')::int AS under_review,
      COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
      COUNT(*) FILTER (WHERE zone_type = 'residential')::int AS residential,
      COUNT(*) FILTER (WHERE zone_type = 'commercial')::int AS commercial,
      COUNT(*) FILTER (WHERE zone_type = 'industrial')::int AS industrial,
      COUNT(*) FILTER (WHERE zone_type = 'agricultural')::int AS agricultural,
      COUNT(*) FILTER (WHERE zone_type = 'institutional')::int AS institutional,
      COUNT(*) FILTER (WHERE zone_type = 'protected_area')::int AS protected_area,
      COUNT(*) FILTER (WHERE zone_type = 'mixed_use')::int AS mixed_use,
      COALESCE(SUM(land_area), 0)::float AS total_land_area
    FROM zoning_records
    WHERE 1=1
      ${zone_type ? sql`AND zone_type = ${zone_type}` : sql``}
      ${status ? sql`AND status = ${status}` : sql``}
    GROUP BY barangay
    ORDER BY barangay
  `);

  res.json(rows.rows);
});

// GET /reports/land-use-summary
router.get("/reports/land-use-summary", async (_req, res) => {
  const rows = await db.execute(sql`
    SELECT
      zone_type,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'under_review')::int AS under_review,
      COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
      COALESCE(SUM(land_area), 0)::float AS total_land_area,
      COALESCE(AVG(land_area), 0)::float AS avg_land_area,
      COUNT(DISTINCT barangay)::int AS barangay_count
    FROM zoning_records
    GROUP BY zone_type
    ORDER BY total DESC
  `);

  const result = rows.rows.map((r: any) => ({
    ...r,
    color: ZONE_COLORS[r.zone_type] ?? "#94A3B8",
  }));

  res.json(result);
});

export default router;
