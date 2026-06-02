import { CheckCircle2, Clock, XCircle, FileText, RefreshCw, AlertTriangle, TrendingUp, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  useGetDashboardSummary,
  useGetZoneDistribution,
  useGetRecentActivity,
  useGetSyncStats,
} from "@workspace/api-client-react";

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value?: number;
  icon: React.ElementType;
  color: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="mt-1 h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold mt-1">{value ?? 0}</p>
            )}
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const ZONE_LABELS: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  industrial: "Industrial",
  agricultural: "Agricultural",
  institutional: "Institutional",
  protected_area: "Protected",
  mixed_use: "Mixed Use",
};

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: zoneDistribution, isLoading: loadingZones } = useGetZoneDistribution();
  const { data: recentActivity, isLoading: loadingActivity } = useGetRecentActivity();
  const { data: syncStats, isLoading: loadingSync } = useGetSyncStats();

  const zoneData = (zoneDistribution ?? []).map((z) => ({
    ...z,
    name: ZONE_LABELS[z.zone_type] ?? z.zone_type,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Records"
          value={summary?.total_records}
          icon={FileText}
          color="bg-primary/10 text-primary"
          loading={loadingSummary}
        />
        <StatCard
          title="Approved"
          value={summary?.approved_records}
          icon={CheckCircle2}
          color="bg-green-500/10 text-green-600 dark:text-green-400"
          loading={loadingSummary}
        />
        <StatCard
          title="Pending Validation"
          value={summary?.pending_validations}
          icon={Clock}
          color="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          loading={loadingSummary}
        />
        <StatCard
          title="Rejected"
          value={summary?.rejected_records}
          icon={XCircle}
          color="bg-destructive/10 text-destructive"
          loading={loadingSummary}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Zone Distribution Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Zone Distribution
            </CardTitle>
            <CardDescription>Breakdown of records by zone type</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingZones ? (
              <Skeleton className="h-64 w-full" />
            ) : zoneData.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                No zone data available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={zoneData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {zoneData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Sync Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Sync Statistics
            </CardTitle>
            <CardDescription>KoboToolbox integration status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingSync ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))
            ) : (
              <>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Total Syncs</span>
                  <span className="font-semibold">{syncStats?.total_syncs ?? 0}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Successful</span>
                  <span className="font-semibold text-green-600">{syncStats?.successful_syncs ?? 0}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Failed</span>
                  <span className="font-semibold text-destructive">{syncStats?.failed_syncs ?? 0}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Synced Today</span>
                  <span className="font-semibold">{syncStats?.records_synced_today ?? 0}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-sm text-muted-foreground">Last Status</span>
                  <Badge
                    variant={
                      syncStats?.last_sync_status === "success"
                        ? "default"
                        : syncStats?.last_sync_status === "failed"
                        ? "destructive"
                        : "secondary"
                    }
                    className="ml-auto"
                  >
                    {syncStats?.last_sync_status ?? "Never"}
                  </Badge>
                </div>
                {syncStats?.last_sync_at && (
                  <p className="text-xs text-muted-foreground">
                    Last sync: {new Date(syncStats.last_sync_at).toLocaleString()}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest system actions and events</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingActivity ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !recentActivity?.length ? (
            <div className="flex flex-col items-center py-10 text-muted-foreground">
              <Activity className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{item.description}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.user_name} &middot; {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
