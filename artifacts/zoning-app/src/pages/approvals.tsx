import { useState } from "react";
import { Link } from "wouter";
import {
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Eye,
  Search,
  Filter,
} from "lucide-react";
import {
  useListZoningRecords,
  getListZoningRecordsQueryKey,
  useUpdateZoningRecord,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

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

const STATUS_ICON: Record<string, React.ReactNode> = {
  approved: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  under_review: <Clock className="h-4 w-4 text-blue-500" />,
  rejected: <XCircle className="h-4 w-4 text-red-500" />,
};

type ReviewAction = "approved" | "rejected" | "under_review";

const TABS = [
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

export default function Approvals() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [statusTab, setStatusTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<{ id: number; ref: string } | null>(null);
  const [comment, setComment] = useState("");
  const [reviewAction, setReviewAction] = useState<ReviewAction>("approved");

  const queryParams = {
    limit: 50,
    ...(statusTab !== "all" ? { status: statusTab } : {}),
    ...(search ? { search } : {}),
  };

  const { data, isLoading } = useListZoningRecords(queryParams, {
    query: { queryKey: getListZoningRecordsQueryKey(queryParams) },
  });

  const updateMutation = useUpdateZoningRecord({
    mutation: {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: getListZoningRecordsQueryKey() });
        setReviewDialogOpen(false);
        setComment("");
        toast({
          title: `Record ${reviewAction.replace(/_/g, " ")}`,
          description: `${selectedRecord?.ref} has been updated.`,
        });
      },
    },
  });

  const counts = {
    pending: data?.data.filter((r) => r.status === "pending").length ?? 0,
    under_review: data?.data.filter((r) => r.status === "under_review").length ?? 0,
    approved: data?.data.filter((r) => r.status === "approved").length ?? 0,
    rejected: data?.data.filter((r) => r.status === "rejected").length ?? 0,
  };

  function openReview(id: number, ref: string, action: ReviewAction) {
    setSelectedRecord({ id, ref });
    setReviewAction(action);
    setComment("");
    setReviewDialogOpen(true);
  }

  function submitReview() {
    if (!selectedRecord) return;
    updateMutation.mutate({
      id: selectedRecord.id,
      data: {
        status: reviewAction,
        ...(comment ? { notes: comment } : {}),
      },
    });
  }

  const records = data?.data ?? [];

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search reference, owner, barangay..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
              {t.label}
              {t.value !== "all" && statusTab === "all" && counts[t.value as keyof typeof counts] > 0 && (
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-semibold">
                  {counts[t.value as keyof typeof counts]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={statusTab} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : !records.length ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium">
                No {statusTab !== "all" ? statusTab.replace(/_/g, " ") : ""} records found
              </p>
              <p className="text-sm">
                {statusTab === "pending"
                  ? "New zoning records will appear here when created."
                  : "No records match this status."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <Card key={record.id} className="overflow-hidden">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      {/* Status icon */}
                      <div className="mt-0.5 shrink-0">{STATUS_ICON[record.status]}</div>

                      {/* Record details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-mono text-sm font-semibold">{record.reference_number}</span>
                          <Badge variant={STATUS_VARIANTS[record.status] ?? "outline"} className="capitalize">
                            {record.status.replace(/_/g, " ")}
                          </Badge>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ZONE_COLORS[record.zone_type] ?? ""}`}
                          >
                            {record.zone_type.replace(/_/g, " ")}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                          <p>
                            <span className="text-muted-foreground">Applicant: </span>
                            <span className="font-medium">{record.owner_name}</span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">Barangay: </span>
                            {record.barangay}
                          </p>
                          {record.project_type && (
                            <p>
                              <span className="text-muted-foreground">Project: </span>
                              {record.project_type}
                            </p>
                          )}
                          {record.land_area && (
                            <p>
                              <span className="text-muted-foreground">Lot Area: </span>
                              {Number(record.land_area).toLocaleString()} sqm
                            </p>
                          )}
                          <p>
                            <span className="text-muted-foreground">Date Filed: </span>
                            {new Date(record.created_at).toLocaleDateString("en-PH", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          {record.or_no && (
                            <p>
                              <span className="text-muted-foreground">O.R. No.: </span>
                              {record.or_no}
                            </p>
                          )}
                        </div>

                        {record.notes && (
                          <div className="mt-2 flex items-start gap-1.5 rounded-md bg-muted/50 px-3 py-2">
                            <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">{record.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex shrink-0 flex-col gap-2">
                        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                          <Link href={`/zoning-records/${record.id}/form`}>
                            <Eye className="h-3.5 w-3.5" />
                            View Form
                          </Link>
                        </Button>

                        {(record.status === "pending" || record.status === "under_review") && (
                          <>
                            <Button
                              size="sm"
                              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => openReview(record.id, record.reference_number, "approved")}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                            {record.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                onClick={() => openReview(record.id, record.reference_number, "under_review")}
                              >
                                <Clock className="h-3.5 w-3.5" />
                                Review
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-destructive border-destructive/20 hover:bg-destructive/5"
                              onClick={() => openReview(record.id, record.reference_number, "rejected")}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </>
                        )}

                        {record.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-destructive border-destructive/20 hover:bg-destructive/5"
                            onClick={() => openReview(record.id, record.reference_number, "rejected")}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Revoke
                          </Button>
                        )}

                        {record.status === "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            onClick={() => openReview(record.id, record.reference_number, "under_review")}
                          >
                            <Clock className="h-3.5 w-3.5" />
                            Re-review
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize flex items-center gap-2">
              {reviewAction === "approved" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {reviewAction === "under_review" && <Clock className="h-5 w-5 text-blue-600" />}
              {reviewAction === "rejected" && <XCircle className="h-5 w-5 text-destructive" />}
              {reviewAction === "approved"
                ? "Approve"
                : reviewAction === "under_review"
                ? "Mark as Under Review"
                : "Reject"}{" "}
              — {selectedRecord?.ref}
            </DialogTitle>
            <DialogDescription>
              Optionally add a comment or remarks before submitting your decision.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="review-comment">Remarks (optional)</Label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add notes for the encoder or planning officer..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitReview}
              disabled={updateMutation.isPending}
              className={
                reviewAction === "approved"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : reviewAction === "rejected"
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  : ""
              }
            >
              {updateMutation.isPending
                ? "Saving..."
                : reviewAction === "approved"
                ? "Approve Record"
                : reviewAction === "rejected"
                ? "Reject Record"
                : "Mark Under Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
