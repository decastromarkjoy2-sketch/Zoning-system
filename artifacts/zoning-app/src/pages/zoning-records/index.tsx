import { useState } from "react";
import { Link } from "wouter";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  useListZoningRecords,
  getListZoningRecordsQueryKey,
  useDeleteZoningRecord,
  useCreateZoningRecord,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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

function ZoneChip({ type }: { type: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ZONE_COLORS[type] ?? ""}`}>
      {type.replace(/_/g, " ")}
    </span>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="col-span-2 pt-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <Separator className="mt-1" />
    </div>
  );
}

export default function ZoningRecords() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [zoneTypeValue, setZoneTypeValue] = useState("residential");
  const [projectNatureValue, setProjectNatureValue] = useState("NEW DEVELOPMENT");
  const [rightOverLandValue, setRightOverLandValue] = useState("OWNED");
  const [projectTenureValue, setProjectTenureValue] = useState("PERMANENT");
  const [releaseModeValue, setReleaseModeValue] = useState("pickup");

  const params = {
    page,
    limit: 15,
    ...(search ? { search } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(zoneFilter !== "all" ? { zone_type: zoneFilter } : {}),
  };

  const { data, isLoading } = useListZoningRecords(params, {
    query: { queryKey: getListZoningRecordsQueryKey(params) },
  });

  const deleteMutation = useDeleteZoningRecord({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListZoningRecordsQueryKey() }),
    },
  });

  const createMutation = useCreateZoningRecord({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListZoningRecordsQueryKey() });
        setCreateOpen(false);
        setZoneTypeValue("residential");
        setProjectNatureValue("NEW DEVELOPMENT");
        setRightOverLandValue("OWNED");
        setProjectTenureValue("PERMANENT");
        setReleaseModeValue("pickup");
        setShowAdvanced(false);
      },
    },
  });

  const totalPages = Math.ceil((data?.total ?? 0) / 15);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const get = (k: string) => (fd.get(k) as string) || undefined;
    const getNum = (k: string) => fd.get(k) ? Number(fd.get(k)) : undefined;

    createMutation.mutate({
      data: {
        owner_name: fd.get("owner_name") as string,
        owner_contact: get("owner_contact"),
        barangay: fd.get("barangay") as string,
        address: fd.get("address") as string,
        zone_type: zoneTypeValue as any,
        land_area: getNum("land_area"),
        floor_area: getNum("floor_area"),
        gps_lat: getNum("gps_lat"),
        gps_lng: getNum("gps_lng"),
        notes: get("notes"),
        or_no: get("or_no"),
        date_of_payment: get("date_of_payment"),
        corporation_name: get("corporation_name"),
        corporation_address: get("corporation_address"),
        authorized_rep_name: get("authorized_rep_name"),
        authorized_rep_address: get("authorized_rep_address"),
        project_type: get("project_type"),
        project_nature: projectNatureValue || get("project_nature"),
        right_over_land: rightOverLandValue,
        project_tenure: projectTenureValue,
        tct_tdn: get("tct_tdn"),
        project_cost: getNum("project_cost"),
        amount_paid: getNum("amount_paid"),
        release_mode: releaseModeValue,
        date_issued: get("date_issued"),
      },
    });
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search owner, barangay, reference..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={zoneFilter} onValueChange={(v) => { setZoneFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Zone Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            <SelectItem value="residential">Residential</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="industrial">Industrial</SelectItem>
            <SelectItem value="agricultural">Agricultural</SelectItem>
            <SelectItem value="institutional">Institutional</SelectItem>
            <SelectItem value="protected_area">Protected Area</SelectItem>
            <SelectItem value="mixed_use">Mixed Use</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="ml-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Record
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Application for Locational Clearance</DialogTitle>
              <DialogDescription>
                Fill in the application details below. Fields marked * are required.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate}>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-2">

                {/* ── Payment Details ── */}
                <SectionHeader label="Payment Details" />
                <div className="space-y-1.5">
                  <Label htmlFor="or_no">O.R. No.</Label>
                  <Input id="or_no" name="or_no" placeholder="Official Receipt number" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="date_of_payment">Date of Payment</Label>
                  <Input id="date_of_payment" name="date_of_payment" type="date" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="amount_paid">Amount Paid (₱)</Label>
                  <Input id="amount_paid" name="amount_paid" type="number" step="0.01" placeholder="0.00" />
                </div>

                {/* ── Applicant Information ── */}
                <SectionHeader label="Applicant Information" />
                <div className="space-y-1.5">
                  <Label htmlFor="owner_name">Name of Applicant (Last, First, Middle) *</Label>
                  <Input id="owner_name" name="owner_name" required placeholder="e.g. Dela Cruz, Juan A." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="owner_contact">Tel. / Contact No.</Label>
                  <Input id="owner_contact" name="owner_contact" placeholder="+63 9xx xxx xxxx" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="address">Address of Applicant *</Label>
                  <Input id="address" name="address" required placeholder="Purok, Barangay, Municipality" />
                </div>

                {/* ── Corporation / Representative ── */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="col-span-2 -mb-1 justify-start text-muted-foreground"
                  onClick={() => setShowAdvanced((v) => !v)}
                >
                  {showAdvanced ? <ChevronUp className="mr-1 h-3 w-3" /> : <ChevronDown className="mr-1 h-3 w-3" />}
                  {showAdvanced ? "Hide" : "Show"} Corporation &amp; Representative fields
                </Button>

                {showAdvanced && (
                  <>
                    <SectionHeader label="Corporation (if applicable)" />
                    <div className="space-y-1.5">
                      <Label htmlFor="corporation_name">Name of Corporation</Label>
                      <Input id="corporation_name" name="corporation_name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="corporation_address">Address of Corporation</Label>
                      <Input id="corporation_address" name="corporation_address" />
                    </div>

                    <SectionHeader label="Authorized Representative" />
                    <div className="space-y-1.5">
                      <Label htmlFor="authorized_rep_name">Name of Authorized Representative</Label>
                      <Input id="authorized_rep_name" name="authorized_rep_name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="authorized_rep_address">Address of Authorized Representative</Label>
                      <Input id="authorized_rep_address" name="authorized_rep_address" />
                    </div>
                  </>
                )}

                {/* ── Project Details ── */}
                <SectionHeader label="Project Details" />
                <div className="space-y-1.5">
                  <Label htmlFor="project_type">Project Type</Label>
                  <Input id="project_type" name="project_type" placeholder="e.g. One storey residential building" />
                </div>
                <div className="space-y-1.5">
                  <Label>Project Nature</Label>
                  <Select value={projectNatureValue} onValueChange={setProjectNatureValue}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW DEVELOPMENT">New Development</SelectItem>
                      <SelectItem value="ADDITION/ALTERATION">Addition / Alteration</SelectItem>
                      <SelectItem value="RENOVATION">Renovation</SelectItem>
                      <SelectItem value="CHANGE OF USE">Change of Use</SelectItem>
                      <SelectItem value="TEMPORARY">Temporary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* ── Project Location & Scope ── */}
                <SectionHeader label="Project Location &amp; Scope" />
                <div className="space-y-1.5">
                  <Label htmlFor="barangay">Barangay *</Label>
                  <Input id="barangay" name="barangay" required placeholder="e.g. Poblacion" />
                </div>
                <div className="space-y-1.5">
                  <Label>Zone / Land Use *</Label>
                  <Select value={zoneTypeValue} onValueChange={setZoneTypeValue}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                      <SelectItem value="agricultural">Agricultural</SelectItem>
                      <SelectItem value="institutional">Institutional</SelectItem>
                      <SelectItem value="protected_area">Protected Area</SelectItem>
                      <SelectItem value="mixed_use">Mixed Use</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="land_area">Lot Area (sqm)</Label>
                  <Input id="land_area" name="land_area" type="number" step="0.01" placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="floor_area">Floor Area (sqm)</Label>
                  <Input id="floor_area" name="floor_area" type="number" step="0.01" placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gps_lat">GPS Latitude</Label>
                  <Input id="gps_lat" name="gps_lat" type="number" step="0.0000001" placeholder="9.6312" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gps_lng">GPS Longitude</Label>
                  <Input id="gps_lng" name="gps_lng" type="number" step="0.0000001" placeholder="126.1978" />
                </div>

                {/* ── Land & Tenure ── */}
                <SectionHeader label="Land &amp; Tenure" />
                <div className="space-y-1.5">
                  <Label>Right Over Land</Label>
                  <Select value={rightOverLandValue} onValueChange={setRightOverLandValue}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWNED">Owned</SelectItem>
                      <SelectItem value="WITH CONSENT">With Consent of Owner</SelectItem>
                      <SelectItem value="LEASED">Leased</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Project Tenure</Label>
                  <Select value={projectTenureValue} onValueChange={setProjectTenureValue}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERMANENT">Permanent</SelectItem>
                      <SelectItem value="TEMPORARY">Temporary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tct_tdn">TCT / TDN No.</Label>
                  <Input id="tct_tdn" name="tct_tdn" placeholder="TCT-XXXXXXX or TDN-XXXXXXX" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="project_cost">Project Cost (₱)</Label>
                  <Input id="project_cost" name="project_cost" type="number" step="0.01" placeholder="0.00" />
                </div>

                {/* ── Release & Decision ── */}
                <SectionHeader label="Release of Decision" />
                <div className="space-y-1.5">
                  <Label>Preferred Mode of Release</Label>
                  <Select value={releaseModeValue} onValueChange={setReleaseModeValue}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pickup">Pick-up</SelectItem>
                      <SelectItem value="mail">Mail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="date_issued">Date Issued</Label>
                  <Input id="date_issued" name="date_issued" type="date" />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="notes">Notes / Remarks</Label>
                  <Textarea id="notes" name="notes" rows={2} placeholder="Additional notes..." />
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : "Submit Application"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Barangay</TableHead>
              <TableHead>Zone Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Land Area</TableHead>
              <TableHead className="hidden lg:table-cell">Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !data?.data.length ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center text-muted-foreground">
                  No zoning records found. Create your first record.
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((record) => (
                <TableRow key={record.id} className="hover:bg-muted/40">
                  <TableCell className="font-mono text-xs font-medium">{record.reference_number}</TableCell>
                  <TableCell className="font-medium">{record.owner_name}</TableCell>
                  <TableCell>{record.barangay}</TableCell>
                  <TableCell><ZoneChip type={record.zone_type} /></TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[record.status] ?? "outline"} className="capitalize">
                      {record.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {record.land_area ? `${Number(record.land_area).toLocaleString()} sqm` : "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {new Date(record.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="View Generated Forms">
                        <Link href={`/zoning-records/${record.id}/form`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Record</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {record.reference_number}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteMutation.mutate({ id: record.id })}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {(data?.total ?? 0) > 15 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data?.total} total records</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
