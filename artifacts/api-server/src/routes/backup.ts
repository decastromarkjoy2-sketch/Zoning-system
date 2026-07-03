import { Router } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import { BACKUP_DIR, getBackupState, listBackups, runBackup } from "../lib/backup-scheduler";

const execAsync = promisify(exec);
const router = Router();

function canManageBackups(role: string | undefined): boolean {
  return role === "administrator" || role === "planning_officer";
}

router.post("/backup/download", async (req, res) => {
  const userId = req.session.userId;
  const userRole = req.session.userRole;

  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  if (!canManageBackups(userRole)) {
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

router.get("/backup/status", async (req, res) => {
  const userId = req.session.userId;
  const userRole = req.session.userRole;

  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  if (!canManageBackups(userRole)) {
    res.status(403).json({ error: "Only Administrators and Planning Officers can view backup status." });
    return;
  }

  try {
    const [state, backups] = await Promise.all([getBackupState(), listBackups()]);
    res.json({ ...state, backups });
  } catch (err) {
    req.log.error({ err }, "Failed to load backup status");
    res.status(500).json({ error: "Failed to load backup status." });
  }
});

router.post("/backup/run-now", async (req, res) => {
  const userId = req.session.userId;
  const userRole = req.session.userRole;

  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  if (!canManageBackups(userRole)) {
    res.status(403).json({ error: "Only Administrators and Planning Officers can trigger backups." });
    return;
  }

  try {
    const info = await runBackup();
    res.json(info);
  } catch (err) {
    req.log.error({ err }, "Manual backup run failed");
    res.status(500).json({ error: err instanceof Error ? err.message : "Backup failed." });
  }
});

router.get("/backup/local/:filename", async (req, res) => {
  const userId = req.session.userId;
  const userRole = req.session.userRole;

  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  if (!canManageBackups(userRole)) {
    res.status(403).json({ error: "Only Administrators and Planning Officers can download backups." });
    return;
  }

  const filename = req.params.filename;
  if (!/^zoning-backup-[\d-T]+\.sql$/.test(filename)) {
    res.status(400).json({ error: "Invalid filename." });
    return;
  }

  const filePath = path.join(BACKUP_DIR, filename);
  try {
    await fs.access(filePath);
  } catch {
    res.status(404).json({ error: "Backup file not found." });
    return;
  }

  res.download(filePath, filename);
});

export default router;
