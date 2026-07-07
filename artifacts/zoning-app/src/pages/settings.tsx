import { useState, useEffect, useCallback } from "react";
import { Sun, Moon, Monitor, Map, Info, ExternalLink, ImageIcon, Upload, Trash2, Database, Download, RefreshCw, Clock, CheckCircle2, XCircle, Building2 } from "lucide-react";
import { useTheme } from "next-themes";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAppLogo } from "@/hooks/use-app-logo";
import { useAppBranding } from "@/hooks/use-app-branding";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BackupFileInfo {
  filename: string;
  sizeBytes: number;
  createdAt: string;
}

interface BackupStatus {
  lastRunAt: string | null;
  lastRunStatus: "success" | "failed" | null;
  lastError: string | null;
  nextRunAt: string | null;
  intervalHours: number;
  running: boolean;
  backups: BackupFileInfo[];
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { logoUrl, saveLogo, removeLogo } = useAppLogo();
  const { appName, divisionName, municipalityName, saveBranding } = useAppBranding();
  const { toast } = useToast();
  const { user } = useAuth();
  const [brandingName, setBrandingName] = useState(appName);
  const [brandingDivision, setBrandingDivision] = useState(divisionName);
  const [brandingMunicipality, setBrandingMunicipality] = useState(municipalityName);
  const [brandingSaving, setBrandingSaving] = useState(false);

  useEffect(() => { setBrandingName(appName); }, [appName]);
  useEffect(() => { setBrandingDivision(divisionName); }, [divisionName]);
  useEffect(() => { setBrandingMunicipality(municipalityName); }, [municipalityName]);

  async function handleSaveBranding() {
    setBrandingSaving(true);
    try {
      await saveBranding(brandingName, brandingDivision, brandingMunicipality);
      toast({ title: "Branding saved", description: "Application name, division, and municipality updated." });
    } catch (err) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : "Unknown error.", variant: "destructive" });
    } finally {
      setBrandingSaving(false);
    }
  }

  const [backingUp, setBackingUp] = useState(false);
  const [runningNow, setRunningNow] = useState(false);
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const canBackup = user?.role === "administrator" || user?.role === "planning_officer";

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/backup/status", { credentials: "include" });
      if (res.ok) {
        setBackupStatus(await res.json());
      }
    } catch {
      // ignore — status panel just stays empty
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canBackup) fetchStatus();
  }, [canBackup, fetchStatus]);

  async function handleRunNow() {
    setRunningNow(true);
    try {
      const res = await fetch("/api/backup/run-now", { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Backup failed", description: (data as { error?: string }).error ?? "Unknown error.", variant: "destructive" });
      } else {
        toast({ title: "Backup created", description: (data as { filename?: string }).filename });
      }
      await fetchStatus();
    } catch {
      toast({ title: "Backup failed", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setRunningNow(false);
    }
  }

  async function handleDownloadLocal(filename: string) {
    const res = await fetch(`/api/backup/local/${encodeURIComponent(filename)}`, { credentials: "include" });
    if (!res.ok) {
      toast({ title: "Download failed", description: "Could not fetch backup file.", variant: "destructive" });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleBackup() {
    setBackingUp(true);
    try {
      const res = await fetch("/api/backup/download", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Backup failed", description: (data as { error?: string }).error ?? "Unknown error.", variant: "destructive" });
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `zoning-backup-${Date.now()}.sql`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Backup downloaded", description: filename });
    } catch {
      toast({ title: "Backup failed", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setBackingUp(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Unsupported format", description: "Please upload a JPG or PNG image.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 2 MB.", variant: "destructive" });
      return;
    }

    await saveLogo(file);
    toast({ title: "Logo updated", description: "The new logo will appear on the login screen." });
  }

  function handleRemove() {
    removeLogo();
    toast({ title: "Logo removed", description: "The default icon will be used." });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-primary" />
            Appearance
          </CardTitle>
          <CardDescription>Choose your preferred display theme.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
              { value: "system", label: "System", icon: Monitor },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all hover:bg-muted/50 ${
                  theme === value ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <Icon className={`h-6 w-6 ${theme === value ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${theme === value ? "text-primary" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Organization Logo
          </CardTitle>
          <CardDescription>
            Upload a JPG or PNG logo (max 2 MB). It appears on the login screen in place of the default icon.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary shadow overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Current logo" className="h-full w-full object-cover" />
              ) : (
                <Map className="h-10 w-10 text-primary-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {logoUrl ? "Custom logo is active." : "Using the default map icon."}
              </p>
              <div className="flex gap-2 flex-wrap">
                {/* Label triggers the file input natively — no JS click() needed */}
                <label
                  htmlFor="logo-file-input"
                  className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {logoUrl ? "Replace Logo" : "Upload Logo"}
                </label>
                <input
                  id="logo-file-input"
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  className="sr-only"
                  onChange={handleFileChange}
                />
                {logoUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={handleRemove}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Accepted formats: JPG, PNG — square images work best (e.g. 256×256 px).
          </p>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Application Branding
          </CardTitle>
          <CardDescription>
            Customize the application name and division label shown on the login screen, sidebar, and throughout the system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="branding-app-name">Application Name</Label>
              <Input
                id="branding-app-name"
                value={brandingName}
                onChange={(e) => setBrandingName(e.target.value)}
                placeholder="Municipal Zoning Information System"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="branding-division">Division / LGU Unit</Label>
              <Input
                id="branding-division"
                value={brandingDivision}
                onChange={(e) => setBrandingDivision(e.target.value)}
                placeholder="LGU Planning Division"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="branding-municipality">Municipality/City Name</Label>
              <Input
                id="branding-municipality"
                value={brandingMunicipality}
                onChange={(e) => setBrandingMunicipality(e.target.value)}
                placeholder="Municipality of Tago"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveBranding} disabled={brandingSaving} size="sm">
              {brandingSaving ? "Saving…" : "Save Branding Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Automatic local backups — admin/planning_officer only */}
      {canBackup && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Automatic Backups
          </CardTitle>
          <CardDescription>
            The server automatically saves a full database dump to local disk every {backupStatus?.intervalHours ?? 24} hours, keeping the 14 most recent copies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusLoading ? (
            <p className="text-sm text-muted-foreground">Loading backup status…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-y-3 text-sm rounded-lg border bg-muted/30 p-3">
                <div>
                  <p className="text-muted-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Last run</p>
                  <p className="font-medium flex items-center gap-1.5 mt-0.5">
                    {backupStatus?.lastRunAt ? new Date(backupStatus.lastRunAt).toLocaleString() : "Not yet run"}
                    {backupStatus?.lastRunStatus === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                    {backupStatus?.lastRunStatus === "failed" && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Next run</p>
                  <p className="font-medium mt-0.5">
                    {backupStatus?.nextRunAt ? new Date(backupStatus.nextRunAt).toLocaleString() : "—"}
                  </p>
                </div>
                {backupStatus?.lastError && (
                  <div className="col-span-2">
                    <p className="text-xs text-destructive">{backupStatus.lastError}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {backupStatus?.backups.length ?? 0} backup{(backupStatus?.backups.length ?? 0) === 1 ? "" : "s"} stored on disk
                </p>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleRunNow} disabled={runningNow}>
                  <RefreshCw className={`h-3.5 w-3.5 ${runningNow ? "animate-spin" : ""}`} />
                  {runningNow ? "Backing up…" : "Run Backup Now"}
                </Button>
              </div>

              {backupStatus && backupStatus.backups.length > 0 && (
                <div className="rounded-lg border divide-y max-h-56 overflow-y-auto">
                  {backupStatus.backups.map((b) => (
                    <div key={b.filename} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-mono text-xs truncate">{b.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(b.createdAt).toLocaleString()} · {formatBytes(b.sizeBytes)}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleDownloadLocal(b.filename)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Download a backup now</p>
              <p className="text-xs text-muted-foreground">
                Generates a fresh dump and downloads it directly, without saving it to the server.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={handleBackup}
              disabled={backingUp}
            >
              <Download className="h-3.5 w-3.5" />
              {backingUp ? "Generating…" : "Download"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            To restore any backup file, run <code className="font-mono">psql &lt;db&gt; &lt; backup.sql</code>.
          </p>
        </CardContent>
      </Card>
      )}

      {/* KoboToolbox shortcut */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            Integrations
          </CardTitle>
          <CardDescription>External service configuration.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">KoboToolbox</p>
              <p className="text-sm text-muted-foreground">Configure API connection and sync interval</p>
            </div>
            <Link href="/kobo">
              <Button variant="outline" size="sm" className="gap-1.5">
                Configure
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            About
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Application</p>
              <p className="font-medium">{appName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Version</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div>
              <p className="text-muted-foreground">Division</p>
              <p className="font-medium">{divisionName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Database</p>
              <Badge variant="default" className="mt-0.5">PostgreSQL</Badge>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Developed by</p>
              <p className="font-medium">Engr. Mark Joy B. De Castro</p>
            </div>
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">
            © 2026 LGU Planning Division. This system is for authorized government personnel only. All actions are logged in the audit trail.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
