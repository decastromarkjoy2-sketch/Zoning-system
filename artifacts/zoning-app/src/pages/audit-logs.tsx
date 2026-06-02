import { useState } from "react";
import { Search, History, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useListAuditLogs,
  getListAuditLogsQueryKey,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  sync: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  review_approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  review_rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  submit_for_approval: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("all");
  const LIMIT = 20;

  const params = {
    page,
    limit: LIMIT,
    ...(entityType !== "all" ? { entity_type: entityType } : {}),
  };

  const { data: logs, isLoading } = useListAuditLogs(params, {
    query: { queryKey: getListAuditLogsQueryKey(params) },
  });

  const hasMore = (logs?.length ?? 0) === LIMIT;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entity Types</SelectItem>
            <SelectItem value="zoning_record">Zoning Record</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="approval">Approval</SelectItem>
            <SelectItem value="kobo_sync">Kobo Sync</SelectItem>
            <SelectItem value="zoning_boundary">Boundary</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead>User</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Changes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : !logs?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
                  <History className="h-10 w-10 mb-3 mx-auto opacity-30" />
                  <p>No audit logs yet. Actions on records will appear here.</p>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/40">
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ACTION_COLORS[log.action] ?? "bg-muted text-muted-foreground"}`}>
                      {log.action.replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm capitalize">{log.entity_type.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.entity_id ?? "—"}</TableCell>
                  <TableCell className="text-sm font-medium">{log.user_name ?? <span className="text-muted-foreground">System</span>}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{log.ip_address ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs">
                    {log.changes ? (
                      <span className="truncate block font-mono">
                        {JSON.stringify(log.changes).slice(0, 60)}
                        {JSON.stringify(log.changes).length > 60 ? "…" : ""}
                      </span>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground px-2">Page {page}</span>
        <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!hasMore}>
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
