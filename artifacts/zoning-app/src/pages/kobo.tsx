import { useState } from "react";
import { RefreshCw, Settings2, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import {
  useGetKoboConfig,
  getGetKoboConfigQueryKey,
  useUpdateKoboConfig,
  useTriggerKoboSync,
  useListSyncLogs,
  getListSyncLogsQueryKey,
  useListKoboSubmissions,
  getListKoboSubmissionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function KoboPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const { data: config, isLoading: loadingConfig } = useGetKoboConfig({
    query: { queryKey: getGetKoboConfigQueryKey() },
  });

  const { data: syncLogs, isLoading: loadingLogs } = useListSyncLogs(
    { limit: 20 },
    { query: { queryKey: getListSyncLogsQueryKey({ limit: 20 }) } }
  );

  const { data: submissions, isLoading: loadingSubmissions } = useListKoboSubmissions(
    { limit: 30 },
    { query: { queryKey: getListKoboSubmissionsQueryKey({ limit: 30 }) } }
  );

  const updateConfig = useUpdateKoboConfig({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetKoboConfigQueryKey() });
        toast({ title: "Configuration saved", description: "KoboToolbox settings updated." });
      },
    },
  });

  const triggerSync = useTriggerKoboSync({
    mutation: {
      onSuccess: (result) => {
        setSyncing(false);
        queryClient.invalidateQueries({ queryKey: getListSyncLogsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetKoboConfigQueryKey() });
        toast({
          title: result.success ? "Sync Complete" : "Sync Failed",
          description: result.message,
          variant: result.success ? "default" : "destructive",
        });
      },
      onError: () => setSyncing(false),
    },
  });

  function handleSaveConfig(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    updateConfig.mutate({
      data: {
        api_url: fd.get("api_url") as string,
        api_token: fd.get("api_token") as string,
        form_id: fd.get("form_id") as string,
        sync_interval_minutes: Number(fd.get("sync_interval_minutes")),
      },
    });
  }

  function handleSync() {
    setSyncing(true);
    triggerSync.mutate({});
  }

  const statusIcon = {
    success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    failed: <XCircle className="h-4 w-4 text-destructive" />,
    in_progress: <Clock className="h-4 w-4 text-amber-500 animate-spin" />,
  };

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {config?.is_configured ? (
              <span className="flex items-center gap-1.5 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Connected to KoboToolbox
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                Not configured — set API token and Form ID below
              </span>
            )}
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing || !config?.is_configured} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="logs">Sync Logs</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                KoboToolbox Configuration
              </CardTitle>
              <CardDescription>Connect to your KoboToolbox account to sync submissions.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingConfig ? (
                <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <form onSubmit={handleSaveConfig} className="space-y-4 max-w-lg">
                  <div className="space-y-1.5">
                    <Label htmlFor="api_url">API URL</Label>
                    <Input id="api_url" name="api_url" defaultValue={config?.api_url ?? "https://kf.kobotoolbox.org"} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="api_token">API Token</Label>
                    <Input id="api_token" name="api_token" type="password" placeholder="Enter your KoboToolbox API token" />
                    <p className="text-xs text-muted-foreground">Get your token from KoboToolbox Account Settings</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="form_id">Form ID</Label>
                    <Input id="form_id" name="form_id" defaultValue={config?.form_id ?? ""} placeholder="e.g. aXmPk8qJdemo123" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sync_interval_minutes">Sync Interval (minutes)</Label>
                    <Input id="sync_interval_minutes" name="sync_interval_minutes" type="number" defaultValue={config?.sync_interval_minutes ?? 5} min={1} max={60} />
                  </div>
                  {config?.last_sync && (
                    <p className="text-xs text-muted-foreground">
                      Last synced: {new Date(config.last_sync).toLocaleString()}
                    </p>
                  )}
                  <Button type="submit" disabled={updateConfig.isPending}>
                    {updateConfig.isPending ? "Saving..." : "Save Configuration"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync Logs</CardTitle>
              <CardDescription>History of all synchronization attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Records Synced</TableHead>
                      <TableHead>Duplicates Skipped</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLogs ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                        </TableRow>
                      ))
                    ) : !syncLogs?.length ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No sync logs yet.</TableCell>
                      </TableRow>
                    ) : (
                      syncLogs.map((log) => {
                        const duration = log.completed_at
                          ? Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)
                          : null;
                        return (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {statusIcon[log.status as keyof typeof statusIcon]}
                                <span className="capitalize">{log.status.replace(/_/g, " ")}</span>
                              </div>
                            </TableCell>
                            <TableCell>{log.records_synced}</TableCell>
                            <TableCell>{log.duplicates_skipped}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{new Date(log.started_at).toLocaleString()}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{duration != null ? `${duration}s` : "—"}</TableCell>
                            <TableCell className="max-w-xs">
                              {log.error_message ? (
                                <span className="text-xs text-destructive truncate block">{log.error_message}</span>
                              ) : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>KoboToolbox Submissions</CardTitle>
              <CardDescription>Raw submissions received from KoboToolbox</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submission ID</TableHead>
                      <TableHead>Form ID</TableHead>
                      <TableHead>Synced At</TableHead>
                      <TableHead>Processed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingSubmissions ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                        </TableRow>
                      ))
                    ) : !submissions?.length ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No submissions yet. Configure and sync KoboToolbox above.</TableCell>
                      </TableRow>
                    ) : (
                      submissions.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-xs">{s.submission_id}</TableCell>
                          <TableCell className="font-mono text-xs">{s.form_id}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(s.synced_at).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={s.processed ? "default" : "secondary"}>
                              {s.processed ? "Processed" : "Pending"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
