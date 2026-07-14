import { useEffect, useRef, useState } from "react";
import { Filter, Layers } from "lucide-react";
import { ZONE_TYPES } from "@/constants/zones";
import { useGetMapRecords, getGetMapRecordsQueryKey, useListZoningBoundaries } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import "leaflet/dist/leaflet.css";

const ZONE_COLORS: Record<string, string> = {
  residential: "#3B82F6",
  commercial: "#F59E0B",
  industrial: "#6B7280",
  agricultural: "#10B981",
  institutional: "#8B5CF6",
  protected_area: "#06B6D4",
  mixed_use: "#92400E",
};

const STATUS_COLORS: Record<string, string> = {
  approved: "#22c55e",
  pending: "#f59e0b",
  under_review: "#3b82f6",
  rejected: "#ef4444",
};

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [zoneFilter, setZoneFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const params = {
    ...(zoneFilter !== "all" ? { zone_type: zoneFilter } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  };

  const { data: records, isLoading } = useGetMapRecords(params, {
    query: { queryKey: getGetMapRecordsQueryKey(params) },
  });
  const { data: boundaries } = useListZoningBoundaries();

  useEffect(() => {
    let isMounted = true;
    async function initMap() {
      if (!mapRef.current || leafletMapRef.current) return;
      const L = (await import("leaflet")).default;

      // Fix default marker icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });

      if (!isMounted || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [12.8797, 121.774],
        zoom: 6,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      leafletMapRef.current = map;
    }
    initMap();
    return () => { isMounted = false; };
  }, []);

  // Update markers when records change
  useEffect(() => {
    async function updateMarkers() {
      if (!leafletMapRef.current) return;
      const L = (await import("leaflet")).default;

      // Remove old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      if (!records?.length) return;

      const bounds: [number, number][] = [];
      records.forEach((record) => {
        const color = ZONE_COLORS[record.zone_type] ?? "#94A3B8";
        const statusColor = STATUS_COLORS[record.status] ?? "#94A3B8";

        const svgIcon = L.divIcon({
          className: "",
          html: `<div style="
            width:28px;height:28px;
            background:${color};
            border:3px solid ${statusColor};
            border-radius:50%;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            cursor:pointer;
          "></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([record.gps_lat, record.gps_lng], { icon: svgIcon })
          .addTo(leafletMapRef.current)
          .bindPopup(`
            <div style="min-width:200px;font-family:sans-serif;">
              <p style="font-weight:600;margin:0 0 4px">${record.owner_name}</p>
              <p style="font-size:12px;color:#666;margin:0 0 2px">${record.reference_number}</p>
              <p style="font-size:12px;margin:0 0 2px"><strong>Barangay:</strong> ${record.barangay}</p>
              <p style="font-size:12px;margin:0 0 2px">
                <strong>Zone:</strong> <span style="text-transform:capitalize">${record.zone_type.replace(/_/g, " ")}</span>
              </p>
              <p style="font-size:12px;margin:0">
                <strong>Status:</strong> <span style="text-transform:capitalize">${record.status.replace(/_/g, " ")}</span>
              </p>
            </div>
          `);

        markersRef.current.push(marker);
        bounds.push([record.gps_lat, record.gps_lng]);
      });

      if (bounds.length > 0) {
        leafletMapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    }
    updateMarkers();
  }, [records]);

  // Draw GeoJSON boundaries
  useEffect(() => {
    async function drawBoundaries() {
      if (!leafletMapRef.current || !boundaries?.length) return;
      const L = (await import("leaflet")).default;

      boundaries.forEach((b) => {
        try {
          L.geoJSON(b.geojson as any, {
            style: {
              color: b.color ?? ZONE_COLORS[b.zone_type] ?? "#94A3B8",
              weight: 2,
              opacity: 0.8,
              fillOpacity: 0.15,
            },
          })
            .bindPopup(`<strong>${b.name}</strong><br/>${b.description ?? ""}`)
            .addTo(leafletMapRef.current);
        } catch {}
      });
    }
    drawBoundaries();
  }, [boundaries]);

  return (
    <div className="space-y-4 h-full">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Zone Type" />
          </SelectTrigger>
          <SelectContent className="z-[1100]">
            <SelectItem value="all">All Zones</SelectItem>
            {ZONE_TYPES.map(({ value, label }) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="z-[1100]">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 ml-auto text-sm text-muted-foreground">
          <Layers className="h-4 w-4" />
          {isLoading ? <Skeleton className="h-4 w-20" /> : <span>{records?.length ?? 0} records plotted</span>}
        </div>
      </div>

      {/* Map + Legend */}
      <div className="grid gap-4 lg:grid-cols-[1fr_200px]">
        <div className="rounded-xl overflow-hidden border bg-card" style={{ height: "calc(100vh - 260px)", minHeight: 400 }}>
          <div ref={mapRef} className="h-full w-full" />
        </div>

        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Legend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Zone Type</p>
              {Object.entries(ZONE_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2 py-1">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-xs capitalize">{type.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Status (Border)</p>
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <div key={status} className="flex items-center gap-2 py-1">
                  <div className="h-3 w-3 rounded-full border-2 shrink-0" style={{ borderColor: color }} />
                  <span className="text-xs capitalize">{status.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
