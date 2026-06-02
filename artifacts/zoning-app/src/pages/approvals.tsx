import { useState } from "react";
import { CheckCircle2, XCircle, Clock, MessageSquare } from "lucide-react";
import {
  useListApprovals,
  getListApprovalsQueryKey,
  useReviewApproval,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default",
  pending: "secondary",
  under_review: "outline",
  rejected: "destructive",
};

type ReviewAction = "approved" | "rejected" | "under_review";

export default function Approvals() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [statusTab, setStatusTab] = useState("pending");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<{ id: number; ref: string } | null>(null);
  const [comment, setComment] = useState("");
  const [reviewAction, setReviewAction] = useState<ReviewAction>("approved");

  const { data: approvals, isLoading } = useListApprovals(
    { status: statusTab === "all" ? undefined : statusTab },
    { query: { queryKey: getListApprovalsQueryKey({ status: statusTab === "all" ? undefined : statusTab }) } }
  );

  const reviewMutation = useReviewApproval({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListApprovalsQueryKey() });
        setReviewDialogOpen(false);
        setComment("");
        toast({
          title: `Record ${reviewAction}`,
          description: `${selectedApproval?.ref} has been ${reviewAction}.`,
        });
      },
    },
  });

  function openReview(id: number, ref: string, action: ReviewAction) {
    setSelectedApproval({ id, ref });
    setReviewAction(action);
    setComment("");
    setReviewDialogOpen(true);
  }

  function submitReview() {
    if (!selectedApproval) return;
    reviewMutation.mutate({
      id: selectedApproval.id,
      data: {
        status: reviewAction,
        reviewer_id: 1, // demo: logged-in user is admin
        comment: comment || undefined,
      },
    });
  }

  return (
    <div className="space-y-4">
      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="under_review">Under Review</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={statusTab} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
          ) : !approvals?.length ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium">No {statusTab === "all" ? "" : statusTab} approvals</p>
              <p className="text-sm">Records submitted for validation will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvals.map((approval) => (
                <Card key={approval.id} className="overflow-hidden">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-semibold">{approval.record_reference}</span>
                          <Badge variant={STATUS_VARIANTS[approval.status] ?? "outline"} className="capitalize">
                            {approval.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                          <p><span className="text-muted-foreground">Submitted by: </span>{approval.submitter_name}</p>
                          {approval.reviewer_name && (
                            <p><span className="text-muted-foreground">Reviewed by: </span>{approval.reviewer_name}</p>
                          )}
                          <p><span className="text-muted-foreground">Date: </span>{new Date(approval.created_at).toLocaleString()}</p>
                          {approval.reviewed_at && (
                            <p><span className="text-muted-foreground">Reviewed: </span>{new Date(approval.reviewed_at).toLocaleString()}</p>
                          )}
                        </div>
                        {approval.comment && (
                          <div className="mt-2 flex items-start gap-1.5 rounded-md bg-muted/50 px-3 py-2">
                            <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">{approval.comment}</p>
                          </div>
                        )}
                      </div>

                      {(approval.status === "pending" || approval.status === "under_review") && (
                        <div className="flex shrink-0 flex-col gap-2">
                          <Button
                            size="sm"
                            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => openReview(approval.id, approval.record_reference, "approved")}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50"
                            onClick={() => openReview(approval.id, approval.record_reference, "under_review")}
                          >
                            <Clock className="h-3.5 w-3.5" />
                            Review
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-destructive border-destructive/20 hover:bg-destructive/5"
                            onClick={() => openReview(approval.id, approval.record_reference, "rejected")}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </div>
                      )}
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
            <DialogTitle className="capitalize">
              {reviewAction.replace(/_/g, " ")} {selectedApproval?.ref}
            </DialogTitle>
            <DialogDescription>
              Optionally add a comment before submitting your decision.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="review-comment">Comment (optional)</Label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add notes for the encoder or planning officer..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={submitReview}
              disabled={reviewMutation.isPending}
              className={
                reviewAction === "approved"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : reviewAction === "rejected"
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  : ""
              }
            >
              {reviewMutation.isPending ? "Submitting..." : `Submit ${reviewAction.replace(/_/g, " ")}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
