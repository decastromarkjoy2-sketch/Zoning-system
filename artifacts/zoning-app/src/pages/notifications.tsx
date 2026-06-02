import { Bell, CheckCheck, RefreshCw, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import {
  useListNotifications,
  getListNotificationsQueryKey,
  useMarkNotificationRead,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, React.ElementType> = {
  new_submission: RefreshCw,
  approval_update: CheckCircle2,
  sync_failure: AlertTriangle,
  record_update: Info,
};

const TYPE_COLORS: Record<string, string> = {
  new_submission: "text-blue-500 bg-blue-100 dark:bg-blue-900/30",
  approval_update: "text-green-500 bg-green-100 dark:bg-green-900/30",
  sync_failure: "text-red-500 bg-red-100 dark:bg-red-900/30",
  record_update: "text-amber-500 bg-amber-100 dark:bg-amber-900/30",
};

export default function Notifications() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useListNotifications(
    {},
    { query: { queryKey: getListNotificationsQueryKey({}) } }
  );

  const markRead = useMarkNotificationRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      },
    },
  });

  function markAllRead() {
    const unread = notifications?.filter((n) => !n.is_read) ?? [];
    unread.forEach((n) => markRead.mutate({ id: n.id }));
  }

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge className="rounded-full">{unreadCount} unread</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5">
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : !notifications?.length ? (
        <div className="flex flex-col items-center py-20 text-muted-foreground">
          <Bell className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">No notifications</p>
          <p className="text-sm">You're all caught up. New alerts will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const Icon = TYPE_ICONS[notification.type] ?? Info;
            const colorClass = TYPE_COLORS[notification.type] ?? "text-gray-500 bg-gray-100";
            return (
              <Card
                key={notification.id}
                className={cn(
                  "transition-all",
                  !notification.is_read && "border-primary/30 bg-primary/5"
                )}
              >
                <CardContent className="flex items-start gap-4 pt-4 pb-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("font-medium", !notification.is_read && "text-foreground")}>{notification.title}</p>
                      {!notification.is_read && (
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{notification.message}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={() => markRead.mutate({ id: notification.id })}
                    >
                      Mark read
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
