import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  useListNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  CheckCheck,
  ArrowLeft,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthGate } from "@/components/layout/AuthGate";
import { Navbar } from "@/components/layout/Navbar";

type FilterType = "all" | "booking_confirmed" | "token_called" | "nearly_there";

const FILTERS: { label: string; value: FilterType; icon: React.ReactNode }[] = [
  { label: "All", value: "all", icon: <Bell className="w-3.5 h-3.5" /> },
  { label: "Bookings", value: "booking_confirmed", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { label: "Called", value: "token_called", icon: <AlertCircle className="w-3.5 h-3.5" /> },
  { label: "Nearly There", value: "nearly_there", icon: <Clock className="w-3.5 h-3.5" /> },
];

function typeIcon(type: string, size = "w-5 h-5") {
  switch (type) {
    case "booking_confirmed": return <CheckCircle2 className={`${size} text-emerald-500`} />;
    case "token_called":      return <AlertCircle  className={`${size} text-rose-500`} />;
    case "nearly_there":      return <Clock        className={`${size} text-amber-500`} />;
    default:                  return <Bell         className={`${size} text-primary`} />;
  }
}

function typeBg(type: string) {
  switch (type) {
    case "booking_confirmed": return "bg-emerald-50 dark:bg-emerald-950/30";
    case "token_called":      return "bg-rose-50 dark:bg-rose-950/30";
    case "nearly_there":      return "bg-amber-50 dark:bg-amber-950/30";
    default:                  return "bg-primary/5";
  }
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function typeLabel(type: string) {
  switch (type) {
    case "booking_confirmed": return "Booking";
    case "token_called":      return "Called";
    case "nearly_there":      return "Queue Alert";
    default:                  return "Notification";
  }
}

export default function Notifications() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useListNotifications({
    query: { refetchInterval: 15000 },
  });

  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();

  const filtered = filter === "all"
    ? notifications
    : notifications.filter((n) => n.type === filter);

  const unread = notifications.filter((n) => !n.read).length;

  const handleMarkAll = () => {
    markAll.mutate(undefined, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
    });
  };

  const handleClick = (n: (typeof notifications)[number]) => {
    if (!n.read) {
      markOne.mutate(
        { notificationId: n.id },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }) },
      );
    }
    if (n.bookingId) setLocation(`/token/${n.bookingId}`);
  };

  const counts: Record<string, number> = { all: notifications.length };
  for (const n of notifications) {
    counts[n.type] = (counts[n.type] ?? 0) + 1;
  }

  return (
    <AuthGate>
      <div className="min-h-[100dvh] bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocation("/")}
                className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
                <p className="text-sm text-muted-foreground">
                  {unread > 0 ? `${unread} unread` : "All caught up"}
                </p>
              </div>
            </div>
            {unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAll}
                disabled={markAll.isPending}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </Button>
            )}
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground self-center shrink-0" />
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  filter === f.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {f.icon}
                {f.label}
                {counts[f.value] != null && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    filter === f.value ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {counts[f.value]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bell className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-base font-semibold text-foreground mb-1">No notifications here</p>
              <p className="text-sm text-muted-foreground">
                {filter === "all" ? "You're all caught up!" : `No ${typeLabel(filter)} notifications yet.`}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {filtered.map((n, i) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                  >
                    <button
                      onClick={() => handleClick(n)}
                      className={`w-full text-left rounded-2xl border p-4 flex items-start gap-4 transition-all hover:shadow-md active:scale-[0.99] ${
                        !n.read
                          ? `${typeBg(n.type)} border-primary/20 shadow-sm`
                          : "bg-card border-border"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        n.type === "booking_confirmed" ? "bg-emerald-100 dark:bg-emerald-900/40" :
                        n.type === "token_called"      ? "bg-rose-100 dark:bg-rose-900/40" :
                        n.type === "nearly_there"      ? "bg-amber-100 dark:bg-amber-900/40" :
                        "bg-primary/10"
                      }`}>
                        {typeIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-bold ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>
                              {n.title}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              n.type === "booking_confirmed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" :
                              n.type === "token_called"      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400" :
                              n.type === "nearly_there"      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" :
                              "bg-primary/10 text-primary"
                            }`}>
                              {typeLabel(n.type)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!n.read && <div className="w-2 h-2 rounded-full bg-primary" />}
                            <span className="text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{n.body}</p>
                        {n.bookingId && (
                          <span className="inline-block mt-2 text-xs font-medium text-primary underline underline-offset-2">
                            View token →
                          </span>
                        )}
                      </div>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </AuthGate>
  );
}
