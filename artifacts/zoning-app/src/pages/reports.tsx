import React, { useState } from "react";
import {
  FileDown,
  FileSpreadsheet,
  BarChart2,
  MapPin,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import {
  useGetBarangaySummaryReport,
  getGetBarangaySummaryReportQueryKey,
  useGetLandUseSummaryReport,
  getGetLandUseSummaryReportQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const ZONE_COLORS: Record<string, string> = {
  residential: "#3B82F6",
  commercial: "#F59E0B",
  industrial: "#6B7280",
  agricultural: "#10B981",
  institutional: "#8B5CF6",
  protected_area: "#06B6D4",
  mixed_use: "#92400E",
};

const ZONE_LABELS: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  industrial: "Industrial",
  agricultural: "Agricultural",
  institutional: "Institutional",
  protected_area: "Protected Area",
  mixed_use: "Mixed Use",
};

function formatArea(sqm: number): string {
  if (sqm >= 10000) return `${(sqm / 10000).toFixed(2)} ha`;
  return `${sqm.toLocaleString()} sqm`;
}

/* ─── PDF Export ─── */
async function exportPDF(
  type: "barangay" | "land-use",
  barangayData: any[],
  landUseData: any[]
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const now = new Date().toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });

  // Header
  doc.setFontSize(16);
  doc.setTextColor(30, 64, 115);
  doc.text("Municipal Zoning Information System", 40, 40);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated: ${now}`, 40, 58);

  if (type === "barangay") {
    doc.setFontSize(13);
    doc.setTextColor(30, 64, 115);
    doc.text("Barangay Zoning Summary Report", 40, 84);

    autoTable(doc, {
      startY: 96,
      head: [[
        "Barangay", "Total", "Approved", "Pending", "Under Review", "Rejected",
        "Residential", "Commercial", "Industrial", "Agricultural",
        "Institutional", "Protected", "Mixed Use", "Total Land Area",
      ]],
      body: barangayData.map((r) => [
        r.barangay, r.total, r.approved, r.pending, r.under_review, r.rejected,
        r.residential ?? 0, r.commercial ?? 0, r.industrial ?? 0, r.agricultural ?? 0,
        r.institutional ?? 0, r.protected_area ?? 0, r.mixed_use ?? 0,
        formatArea(r.total_land_area),
      ]),
      headStyles: { fillColor: [30, 64, 115], fontSize: 7, halign: "center" },
      bodyStyles: { fontSize: 7 },
      alternateRowStyles: { fillColor: [240, 245, 255] },
      columnStyles: { 0: { halign: "left", fontStyle: "bold" } },
    });

    // Totals row
    const totals = barangayData.reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        approved: acc.approved + r.approved,
        total_land_area: acc.total_land_area + r.total_land_area,
      }),
      { total: 0, approved: 0, total_land_area: 0 }
    );
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    doc.setTextColor(30, 64, 115);
    doc.text(
      `Total: ${totals.total} records across ${barangayData.length} barangays — ${formatArea(totals.total_land_area)} total land area`,
      40, finalY
    );
  } else {
    doc.setFontSize(13);
    doc.setTextColor(30, 64, 115);
    doc.text("Land Use Summary Report", 40, 84);

    autoTable(doc, {
      startY: 96,
      head: [[
        "Zone Type", "Total Records", "Approved", "Pending", "Under Review", "Rejected",
        "Barangays Covered", "Total Land Area", "Avg Land Area",
      ]],
      body: landUseData.map((r) => [
        ZONE_LABELS[r.zone_type] ?? r.zone_type,
        r.total, r.approved, r.pending, r.under_review, r.rejected,
        r.barangay_count,
        formatArea(r.total_land_area),
        formatArea(r.avg_land_area),
      ]),
      headStyles: { fillColor: [30, 64, 115], fontSize: 8, halign: "center" },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [240, 245, 255] },
      columnStyles: { 0: { halign: "left", fontStyle: "bold" } },
    });
  }

  const filename = type === "barangay"
    ? `barangay-zoning-report-${Date.now()}.pdf`
    : `land-use-summary-report-${Date.now()}.pdf`;
  doc.save(filename);
}

/* ─── Excel Export ─── */
async function exportExcel(
  type: "barangay" | "land-use",
  barangayData: any[],
  landUseData: any[]
) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const now = new Date().toLocaleDateString("en-PH");

  if (type === "barangay") {
    // Summary sheet
    const headers = [
      ["Municipal Zoning Information System"],
      ["Barangay Zoning Summary Report"],
      [`Generated: ${now}`],
      [],
      [
        "Barangay", "Total", "Approved", "Pending", "Under Review", "Rejected",
        "Residential", "Commercial", "Industrial", "Agricultural",
        "Institutional", "Protected Area", "Mixed Use", "Total Land Area (sqm)",
      ],
      ...barangayData.map((r) => [
        r.barangay, r.total, r.approved, r.pending, r.under_review, r.rejected,
        r.residential ?? 0, r.commercial ?? 0, r.industrial ?? 0, r.agricultural ?? 0,
        r.institutional ?? 0, r.protected_area ?? 0, r.mixed_use ?? 0,
        parseFloat(r.total_land_area) || 0,
      ]),
      [],
      [
        "TOTAL",
        barangayData.reduce((s, r) => s + r.total, 0),
        barangayData.reduce((s, r) => s + r.approved, 0),
        barangayData.reduce((s, r) => s + r.pending, 0),
        barangayData.reduce((s, r) => s + r.under_review, 0),
        barangayData.reduce((s, r) => s + r.rejected, 0),
        "", "", "", "", "", "", "",
        barangayData.reduce((s, r) => s + (parseFloat(r.total_land_area) || 0), 0),
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws["!cols"] = [{ wch: 30 }, ...Array(13).fill({ wch: 14 })];
    XLSX.utils.book_append_sheet(wb, ws, "Barangay Summary");
  } else {
    const headers = [
      ["Municipal Zoning Information System"],
      ["Land Use Summary Report"],
      [`Generated: ${now}`],
      [],
      [
        "Zone Type", "Total Records", "Approved", "Pending", "Under Review", "Rejected",
        "Barangays Covered", "Total Land Area (sqm)", "Avg Land Area (sqm)",
      ],
      ...landUseData.map((r) => [
        ZONE_LABELS[r.zone_type] ?? r.zone_type,
        r.total, r.approved, r.pending, r.under_review, r.rejected,
        r.barangay_count,
        parseFloat(r.total_land_area) || 0,
        parseFloat(r.avg_land_area) || 0,
      ]),
      [],
      [
        "TOTAL",
        landUseData.reduce((s, r) => s + r.total, 0),
        landUseData.reduce((s, r) => s + r.approved, 0),
        landUseData.reduce((s, r) => s + r.pending, 0),
        landUseData.reduce((s, r) => s + r.under_review, 0),
        landUseData.reduce((s, r) => s + r.rejected, 0),
        landUseData.reduce((s, r) => s + r.barangay_count, 0),
        landUseData.reduce((s, r) => s + (parseFloat(r.total_land_area) || 0), 0),
        "",
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws["!cols"] = [{ wch: 22 }, ...Array(8).fill({ wch: 18 })];
    XLSX.utils.book_append_sheet(wb, ws, "Land Use Summary");
  }

  const filename = type === "barangay"
    ? `barangay-zoning-report-${Date.now()}.xlsx`
    : `land-use-summary-report-${Date.now()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/* ─── Stat chip ─── */
function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex flex-col items-center rounded-lg px-3 py-2 ${color}`}>
      <span className="text-lg font-bold leading-tight">{value}</span>
      <span className="text-xs font-medium opacity-80">{label}</span>
    </div>
  );
}

/* ─── Main page ─── */
export default function Reports() {
  const [activeTab, setActiveTab] = useState<"barangay" | "land-use">("barangay");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  const barangayParams = {
    ...(zoneFilter !== "all" ? { zone_type: zoneFilter } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  };

  const { data: barangayData = [], isLoading: loadingBarangay, refetch: refetchBarangay } =
    useGetBarangaySummaryReport(barangayParams, {
      query: { queryKey: getGetBarangaySummaryReportQueryKey(barangayParams) },
    });

  const { data: landUseData = [], isLoading: loadingLandUse, refetch: refetchLandUse } =
    useGetLandUseSummaryReport({
      query: { queryKey: getGetLandUseSummaryReportQueryKey() },
    });

  const isLoading = activeTab === "barangay" ? loadingBarangay : loadingLandUse;

  function toggleRow(key: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function handleExport(format: "pdf" | "excel") {
    setExporting(format);
    try {
      if (format === "pdf") await exportPDF(activeTab, barangayData, landUseData);
      else await exportExcel(activeTab, barangayData, landUseData);
    } finally {
      setExporting(null);
    }
  }

  // Summary totals for the active tab
  const barangayTotals = barangayData.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      approved: acc.approved + r.approved,
      pending: acc.pending + r.pending,
      under_review: acc.under_review + r.under_review,
      rejected: acc.rejected + r.rejected,
      total_land_area: acc.total_land_area + (parseFloat(String(r.total_land_area)) || 0),
    }),
    { total: 0, approved: 0, pending: 0, under_review: 0, rejected: 0, total_land_area: 0 }
  );

  const landUseTotals = landUseData.reduce(
    (acc, r) => ({ total: acc.total + r.total, total_land_area: acc.total_land_area + (parseFloat(String(r.total_land_area)) || 0) }),
    { total: 0, total_land_area: 0 }
  );

  return (
    <div className="space-y-5">
      {/* Header toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("pdf")}
            disabled={!!exporting || isLoading}
            className="gap-1.5"
          >
            {exporting === "pdf" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 text-red-500" />
            )}
            Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("excel")}
            disabled={!!exporting || isLoading}
            className="gap-1.5"
          >
            {exporting === "excel" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
            )}
            Export Excel
          </Button>
        </div>

        {activeTab === "barangay" && (
          <>
            <Select value={zoneFilter} onValueChange={(v) => setZoneFilter(v)}>
              <SelectTrigger className="w-44 h-8 text-sm">
                <SelectValue placeholder="Zone Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {Object.entries(ZONE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
              <SelectTrigger className="w-40 h-8 text-sm">
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
          </>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="barangay" className="gap-2">
            <MapPin className="h-4 w-4" />
            Barangay Zoning Report
          </TabsTrigger>
          <TabsTrigger value="land-use" className="gap-2">
            <Layers className="h-4 w-4" />
            Land Use Summary
          </TabsTrigger>
        </TabsList>

        {/* ─── BARANGAY REPORT ─── */}
        <TabsContent value="barangay" className="mt-5 space-y-5">
          {/* Summary row */}
          {!loadingBarangay && barangayData.length > 0 && (
            <div className="flex flex-wrap gap-3">
              <Card className="flex-1 min-w-[180px]">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Barangays</p>
                  <p className="text-2xl font-bold">{barangayData.length}</p>
                </CardContent>
              </Card>
              <Card className="flex-1 min-w-[180px]">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Records</p>
                  <p className="text-2xl font-bold">{barangayTotals.total}</p>
                </CardContent>
              </Card>
              <Card className="flex-1 min-w-[180px]">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Land Area</p>
                  <p className="text-2xl font-bold">{formatArea(barangayTotals.total_land_area)}</p>
                </CardContent>
              </Card>
              <Card className="flex-1 min-w-[180px]">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{barangayTotals.approved}</p>
                </CardContent>
              </Card>
              <Card className="flex-1 min-w-[180px]">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Pending / Under Review</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {barangayTotals.pending + barangayTotals.under_review}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Chart */}
          {!loadingBarangay && barangayData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart2 className="h-4 w-4 text-primary" />
                  Records per Barangay
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barangayData} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="barangay" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value, name) => [value, String(name).replace(/_/g, " ")]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="approved" stackId="a" fill="#22c55e" name="Approved" radius={[0,0,0,0]} />
                    <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Pending" />
                    <Bar dataKey="under_review" stackId="a" fill="#3b82f6" name="Under Review" />
                    <Bar dataKey="rejected" stackId="a" fill="#ef4444" name="Rejected" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" />
                Barangay Breakdown
              </CardTitle>
              <CardDescription>
                {barangayData.length} barangay{barangayData.length !== 1 ? "s" : ""} — click a row to expand zone type details
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-b-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Barangay</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Approved</TableHead>
                      <TableHead className="text-center">Pending</TableHead>
                      <TableHead className="text-center">Under Review</TableHead>
                      <TableHead className="text-center">Rejected</TableHead>
                      <TableHead className="text-right">Total Land Area</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingBarangay ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 8 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : !barangayData.length ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-16 text-center text-muted-foreground">
                          No data matching your filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      barangayData.map((row) => {
                        const isExpanded = expandedRows.has(row.barangay);
                        const zoneBreakdown = Object.entries(ZONE_LABELS)
                          .map(([key, label]) => ({ key, label, count: (row as any)[key] ?? 0 }))
                          .filter((z) => z.count > 0);
                        return (
                          <React.Fragment key={row.barangay}>
                            <TableRow
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => toggleRow(row.barangay)}
                            >
                              <TableCell className="text-center">
                                {isExpanded
                                  ? <ChevronUp className="h-4 w-4 text-muted-foreground mx-auto" />
                                  : <ChevronDown className="h-4 w-4 text-muted-foreground mx-auto" />
                                }
                              </TableCell>
                              <TableCell className="font-medium">{row.barangay}</TableCell>
                              <TableCell className="text-center font-semibold">{row.total}</TableCell>
                              <TableCell className="text-center text-green-600 font-medium">{row.approved}</TableCell>
                              <TableCell className="text-center text-amber-600 font-medium">{row.pending}</TableCell>
                              <TableCell className="text-center text-blue-600 font-medium">{row.under_review}</TableCell>
                              <TableCell className="text-center text-destructive font-medium">{row.rejected}</TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {formatArea(parseFloat(String(row.total_land_area)) || 0)}
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow className="bg-muted/30">
                                <TableCell />
                                <TableCell colSpan={7} className="py-3">
                                  <div className="flex flex-wrap gap-2">
                                    {zoneBreakdown.length === 0 ? (
                                      <span className="text-xs text-muted-foreground">No zone breakdown data.</span>
                                    ) : (
                                      zoneBreakdown.map((z) => (
                                        <div
                                          key={z.key}
                                          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                                          style={{ background: ZONE_COLORS[z.key] + "20", color: ZONE_COLORS[z.key] }}
                                        >
                                          <div className="h-2 w-2 rounded-full" style={{ background: ZONE_COLORS[z.key] }} />
                                          {z.label}: <strong>{z.count}</strong>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                    {!loadingBarangay && barangayData.length > 0 && (
                      <TableRow className="bg-primary/5 font-semibold">
                        <TableCell />
                        <TableCell className="text-primary font-bold">TOTAL</TableCell>
                        <TableCell className="text-center">{barangayTotals.total}</TableCell>
                        <TableCell className="text-center text-green-600">{barangayTotals.approved}</TableCell>
                        <TableCell className="text-center text-amber-600">{barangayTotals.pending}</TableCell>
                        <TableCell className="text-center text-blue-600">{barangayTotals.under_review}</TableCell>
                        <TableCell className="text-center text-destructive">{barangayTotals.rejected}</TableCell>
                        <TableCell className="text-right">{formatArea(barangayTotals.total_land_area)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── LAND USE SUMMARY ─── */}
        <TabsContent value="land-use" className="mt-5 space-y-5">
          {/* Pie + Bar side by side */}
          {!loadingLandUse && landUseData.length > 0 && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Zone Type Distribution</CardTitle>
                  <CardDescription>Share of records by zone type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={landUseData}
                        dataKey="total"
                        nameKey="zone_type"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ name, percent }) =>
                          `${ZONE_LABELS[name] ?? name} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {landUseData.map((entry) => (
                          <Cell key={entry.zone_type} fill={entry.color ?? ZONE_COLORS[entry.zone_type]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(value, name) => [value, ZONE_LABELS[String(name)] ?? name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Land Area by Zone (sqm)</CardTitle>
                  <CardDescription>Total recorded land area per zone type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={landUseData.map((r) => ({
                        ...r,
                        name: ZONE_LABELS[r.zone_type] ?? r.zone_type,
                        total_land_area: parseFloat(String(r.total_land_area)) || 0,
                      }))}
                      margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(value) => [`${Number(value).toLocaleString()} sqm`, "Land Area"]}
                      />
                      <Bar dataKey="total_land_area" radius={[4, 4, 0, 0]}>
                        {landUseData.map((entry) => (
                          <Cell key={entry.zone_type} fill={entry.color ?? ZONE_COLORS[entry.zone_type]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-primary" />
                Land Use Summary
              </CardTitle>
              <CardDescription>
                {landUseTotals.total} total records across {landUseData.length} zone types
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-b-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zone Type</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Approved</TableHead>
                      <TableHead className="text-center">Pending</TableHead>
                      <TableHead className="text-center">Under Review</TableHead>
                      <TableHead className="text-center">Rejected</TableHead>
                      <TableHead className="text-center">Barangays</TableHead>
                      <TableHead className="text-right">Total Land Area</TableHead>
                      <TableHead className="text-right">Avg Land Area</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLandUse ? (
                      Array.from({ length: 7 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 9 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : !landUseData.length ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-16 text-center text-muted-foreground">
                          No land use data available.
                        </TableCell>
                      </TableRow>
                    ) : (
                      landUseData.map((row) => (
                        <TableRow key={row.zone_type} className="hover:bg-muted/40">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full shrink-0"
                                style={{ background: row.color ?? ZONE_COLORS[row.zone_type] }}
                              />
                              <span className="font-medium capitalize">
                                {ZONE_LABELS[row.zone_type] ?? row.zone_type.replace(/_/g, " ")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold">{row.total}</TableCell>
                          <TableCell className="text-center text-green-600 font-medium">{row.approved}</TableCell>
                          <TableCell className="text-center text-amber-600 font-medium">{row.pending}</TableCell>
                          <TableCell className="text-center text-blue-600 font-medium">{row.under_review}</TableCell>
                          <TableCell className="text-center text-destructive font-medium">{row.rejected}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{row.barangay_count}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatArea(parseFloat(String(row.total_land_area)) || 0)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatArea(parseFloat(String(row.avg_land_area)) || 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {!loadingLandUse && landUseData.length > 0 && (
                      <TableRow className="bg-primary/5 font-semibold">
                        <TableCell className="text-primary font-bold">TOTAL</TableCell>
                        <TableCell className="text-center">{landUseTotals.total}</TableCell>
                        <TableCell className="text-center text-green-600">
                          {landUseData.reduce((s, r) => s + r.approved, 0)}
                        </TableCell>
                        <TableCell className="text-center text-amber-600">
                          {landUseData.reduce((s, r) => s + r.pending, 0)}
                        </TableCell>
                        <TableCell className="text-center text-blue-600">
                          {landUseData.reduce((s, r) => s + r.under_review, 0)}
                        </TableCell>
                        <TableCell className="text-center text-destructive">
                          {landUseData.reduce((s, r) => s + r.rejected, 0)}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {landUseData.reduce((s, r) => s + r.barangay_count, 0)}
                        </TableCell>
                        <TableCell className="text-right">{formatArea(landUseTotals.total_land_area)}</TableCell>
                        <TableCell />
                      </TableRow>
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
