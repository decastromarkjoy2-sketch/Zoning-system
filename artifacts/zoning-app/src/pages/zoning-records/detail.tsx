import { useRoute, Link } from "wouter";
import { ArrowLeft, MapPin, User, Home, Calendar, FileText, CheckCircle2, Clock } from "lucide-react";
import {
  useGetZoningRecord,
  getGetZoningRecordQueryKey,
  useListApprovals,
  getListApprovalsQueryKey,
  useListAuditLogs,
  getListAuditLogsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

const ZONE_COLORS: Record<string, string> = {
  residential: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  commercial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  industrial: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  agricultural: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  institutional: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  protected_area: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  mixed_use: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default",
  pending: "secondary",
  under_review: "outline",
  rejected: "destructive",
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

export default function ZoningRecordDetail() {
  const [, params] = useRoute("/zoning-records/:id");
  const id = Number(params?.id);

  const { data: record, isLoading } = useGetZoningRecord(id, {
    query: { enabled: !!id, queryKey: getGetZoningRecordQueryKey(id) },
  });

  const { data: approvals } = useListApprovals(
    { record_id: id },
    { query: { enabled: !!id, queryKey: getListApprovalsQueryKey({ record_id: id }) } }
  );

  const { data: auditLogs } = useListAuditLogs(
    { entity_type: "zoning_record", entity_id: id, limit: 10 },
    { query: { enabled: !!id, queryKey: getListAuditLogsQueryKey({ entity_type: "zoning_record", entity_id: id }) } }
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <FileText className="h-12 w-12 text-muted-foreground opacity-30" />
        <p className="text-muted-foreground">Record not found</p>
        <Link href="/zoning-records">
          <Button variant="outline">Back to Records</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/zoning-records">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="font-mono text-sm text-muted-foreground">{record.reference_number}</h2>
          <h1 className="text-xl font-bold">{record.owner_name}</h1>
        </div>
        <Badge variant={STATUS_VARIANTS[record.status] ?? "outline"} className="capitalize text-sm px-3 py-1">
          {record.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Record Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Record Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Owner Name" value={record.owner_name} />
              <Field label="Contact" value={record.owner_contact} />
              <Field label="Barangay" value={record.barangay} />
              <Field label="Address" value={record.address} />
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Zone Type</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ZONE_COLORS[record.zone_type] ?? ""}`}>
                    {record.zone_type.replace(/_/g, " ")}
                  </span>
                </dd>
              </div>
              <Field label="Land Area" value={record.land_area ? `${Number(record.land_area).toLocaleString()} sqm` : null} />
              <Field label="Created" value={new Date(record.created_at).toLocaleDateString()} />
              <Field label="Updated" value={new Date(record.updated_at).toLocaleDateString()} />
            </dl>
            {record.notes && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm">{record.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* GPS / Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-primary" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            {record.gps_lat && record.gps_lng ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Latitude" value={record.gps_lat} />
                  <Field label="Longitude" value={record.gps_lng} />
                </div>
                <a
                  href={`https://www.google.com/maps?q=${record.gps_lat},${record.gps_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="mt-2 w-full">
                    <MapPin className="mr-2 h-4 w-4" />
                    View on Google Maps
                  </Button>
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No GPS coordinates recorded.</p>
            )}
            {record.kobo_submission_id && (
              <>
                <Separator className="my-4" />
                <Field label="KoboToolbox Submission ID" value={record.kobo_submission_id} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approval History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Approval History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!approvals?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No approval history for this record.</p>
          ) : (
            <div className="space-y-3">
              {approvals.map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <Badge variant={STATUS_VARIANTS[a.status] ?? "outline"} className="capitalize mt-0.5">
                    {a.status.replace(/_/g, " ")}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      Submitted by <span className="font-medium">{a.submitter_name}</span>
                      {a.reviewer_name && <> · Reviewed by <span className="font-medium">{a.reviewer_name}</span></>}
                    </p>
                    {a.comment && <p className="mt-1 text-xs text-muted-foreground">"{a.comment}"</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Trail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-primary" />
            Change History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!auditLogs?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No change history available.</p>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">{log.action.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.user_name ?? "System"} · {new Date(log.created_at).toLocaleString()}
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
