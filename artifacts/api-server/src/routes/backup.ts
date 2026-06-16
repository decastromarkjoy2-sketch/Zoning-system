import { Router } from "express";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const router = Router();

router.post("/backup/download", async (req, res) => {
  const userId = req.session.userId;
  const userRole = req.session.userRole;

  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  if (!["administrator", "planning_officer"].includes(userRole ?? "")) {
    res.status(403).json({ error: "Only Administrators and Planning Officers can create backups." });
    return;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    res.status(500).json({ error: "DATABASE_URL not configured." });
    return;
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `zoning-backup-${timestamp}.sql`;

    const { stdout } = await execAsync(
      `pg_dump --no-password --dbname="${dbUrl}" --format=plain --no-owner --no-acl`,
      { maxBuffer: 50 * 1024 * 1024 }
    );

    req.log.info({ filename }, "Database backup created");

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(stdout);
  } catch (err) {
    req.log.error({ err }, "Backup failed");
    res.status(500).json({ error: "Backup failed. Check server logs." });
  }
});

export default router;
