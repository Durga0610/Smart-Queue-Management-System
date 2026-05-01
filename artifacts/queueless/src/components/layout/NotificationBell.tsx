import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { Bell, CheckCircle2, AlertCircle, Clock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

function typeIcon(type: string) {
  switch (type) {
    case "booking_confirmed": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case "token_called":     return <AlertCircle   className="w-4 h-4 text-rose-500" />;
    case "nearly_there":     return <Clock         className="w-4 h-4 text-amber-500" />;
    default:                 return <Bell          className="w-4 h-4 text-primary" />;
  }
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useListNotifications({
    query: { refetchInterval: 15000 },
  });

  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open && unread > 0) {
      markAll.mutate(undefined, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
      });
    }
  };

  const handleClickNotif = (n: (typeof notifications)[number]) => {
    if (!n.read) {
      markOne.mutate(
        { notificationId: n.id },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }) },
      );
    }
    setOpen(false);
    if (n.bookingId) setLocation(`/token/${n.bookingId}`);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center leading-none"
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Notifications</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClickNotif(n)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    <div className="mt-0.5 shrink-0">{typeIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold truncate ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
