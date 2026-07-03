import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { logger } from "./logger";

const execAsync = promisify(exec);

export const BACKUP_DIR = path.join(process.cwd(), "backups");
const RETENTION_COUNT = 14;
const INTERVAL_HOURS = Number(process.env.BACKUP_INTERVAL_HOURS ?? 24);
const INITIAL_DELAY_MS = 60_000;

export interface BackupFileInfo {
  filename: string;
  sizeBytes: number;
  createdAt: string;
}

export interface BackupState {
  lastRunAt: string | null;
  lastRunStatus: "success" | "failed" | null;
  lastError: string | null;
  nextRunAt: string | null;
  intervalHours: number;
  running: boolean;
}

const state: BackupState = {
  lastRunAt: null,
  lastRunStatus: null,
  lastError: null,
  nextRunAt: null,
  intervalHours: INTERVAL_HOURS,
  running: false,
};

export function getBackupState(): BackupState {
  return { ...state };
}

async function ensureBackupDir(): Promise<void> {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
}

async function pruneOldBackups(): Promise<void> {
  const files = await fs.readdir(BACKUP_DIR);
  const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort();
  const excess = sqlFiles.length - RETENTION_COUNT;
  if (excess > 0) {
    for (const file of sqlFiles.slice(0, excess)) {
      await fs.unlink(path.join(BACKUP_DIR, file)).catch(() => {});
    }
  }
}

export async function listBackups(): Promise<BackupFileInfo[]> {
  await ensureBackupDir();
  const files = await fs.readdir(BACKUP_DIR);
  const infos = await Promise.all(
    files
      .filter((f) => f.endsWith(".sql"))
      .map(async (filename) => {
        const stat = await fs.stat(path.join(BACKUP_DIR, filename));
        return {
          filename,
          sizeBytes: stat.size,
          createdAt: stat.mtime.toISOString(),
        };
      }),
  );
  return infos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function runBackup(): Promise<BackupFileInfo> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL not configured.");
  }

  state.running = true;
  try {
    await ensureBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `zoning-backup-${timestamp}.sql`;
    const filePath = path.join(BACKUP_DIR, filename);

    const { stdout } = await execAsync(
      `pg_dump --no-password --dbname="${dbUrl}" --format=plain --no-owner --no-acl`,
      { maxBuffer: 50 * 1024 * 1024 },
    );

    await fs.writeFile(filePath, stdout, "utf-8");
    await pruneOldBackups();

    state.lastRunAt = new Date().toISOString();
    state.lastRunStatus = "success";
    state.lastError = null;
    state.nextRunAt = new Date(Date.now() + INTERVAL_HOURS * 60 * 60 * 1000).toISOString();

    logger.info({ filename }, "Automatic database backup created");

    const stat = await fs.stat(filePath);
    return { filename, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
  } catch (err) {
    state.lastRunAt = new Date().toISOString();
    state.lastRunStatus = "failed";
    state.lastError = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "Automatic database backup failed");
    throw err;
  } finally {
    state.running = false;
  }
}

let started = false;

export function startBackupScheduler(): void {
  if (started) return;
  started = true;

  state.nextRunAt = new Date(Date.now() + INITIAL_DELAY_MS).toISOString();

  setTimeout(() => {
    runBackup().catch(() => {});
    setInterval(() => {
      runBackup().catch(() => {});
    }, INTERVAL_HOURS * 60 * 60 * 1000);
  }, INITIAL_DELAY_MS);

  logger.info({ intervalHours: INTERVAL_HOURS }, "Automatic backup scheduler started");
}
