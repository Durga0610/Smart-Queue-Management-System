import { useEffect } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import {
  useGetMe,
  useListMyBookings,
  useListBranches,
  useListNotifications,
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Ticket,
  Clock,
  MapPin,
  Activity,
  Shuffle,
  Bell,
  CheckCircle2,
  AlertCircle,
  Star,
  TrendingUp,
  Users,
  Zap,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

function pulseColor(level: string) {
  switch (level) {
    case "calm":   return { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", label: "Calm" };
    case "busy":   return { bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-500",   label: "Busy" };
    case "hectic": return { bg: "bg-rose-100",     text: "text-rose-700",     dot: "bg-rose-500",     label: "Hectic" };
    default:       return { bg: "bg-muted",         text: "text-muted-foreground", dot: "bg-gray-400", label: "Unknown" };
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "serving": return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 animate-pulse">Serving Now</span>;
    case "waiting": return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Waiting</span>;
    case "booked":  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">Booked</span>;
    default:        return null;
  }
}

function notifIcon(type: string) {
  switch (type) {
    case "booking_confirmed": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case "token_called":      return <AlertCircle  className="w-4 h-4 text-rose-500" />;
    case "nearly_there":      return <Clock        className="w-4 h-4 text-amber-500" />;
    default:                  return <Bell         className="w-4 h-4 text-primary" />;
  }
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function karmaLevel(karma: number) {
  if (karma >= 200) return { label: "Gold",   color: "text-amber-500",  bg: "bg-amber-50  border-amber-200" };
  if (karma >= 100) return { label: "Silver", color: "text-slate-500",  bg: "bg-slate-50  border-slate-200" };
  return              { label: "Bronze", color: "text-orange-500", bg: "bg-orange-50 border-orange-200" };
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const stagger = {
  show: { transition: { staggerChildren: 0.07 } },
};

export default function Home() {
  const [, setLocation] = useLocation();

  const { data: user, isLoading: meLoading } = useGetMe();
  const isStaff = user?.role === "staff";

  const { data: bookings = [], isLoading: bookingsLoading } = useListMyBookings({
    query: { enabled: !!user && user.role === "customer" },
  });
  const { data: branches = [], isLoading: branchesLoading } = useListBranches({
    query: { enabled: !!user && user.role === "customer", refetchInterval: 30000 },
  });
  const { data: notifications = [] } = useListNotifications({
    query: { enabled: !!user && user.role === "customer", refetchInterval: 15000 },
  });

  useEffect(() => {
    if (isStaff) setLocation("/admin");
  }, [isStaff, setLocation]);

  if (!user) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-2xl space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Activity className="w-4 h-4" />
              <span>Smart Queue Management</span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-foreground tracking-tight leading-tight">
              Wait less.<br />Live more.
            </h1>
            <p className="text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
              QueueLess Pulse transforms standing in line into moving forward. We hold your spot so you don't have to.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <button
                onClick={() => setLocation("/register")}
                className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground rounded-full font-semibold text-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                Get Started
              </button>
              <button
                onClick={() => setLocation("/branches")}
                className="w-full sm:w-auto px-8 py-4 bg-secondary text-secondary-foreground rounded-full font-semibold text-lg hover:bg-secondary/80 transition-all"
              >
                View Branch Pulse
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isStaff) return null;

  const activeBookings = bookings.filter(
    (b) => b.status === "booked" || b.status === "waiting" || b.status === "serving"
  );
  const completedCount = bookings.filter((b) => b.status === "done").length;
  const unreadCount = notifications.filter((n) => !n.read).length;
  const karma = karmaLevel(user.karma ?? 0);
  const todayStr = format(new Date(), "EEEE, d MMMM yyyy");

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">

          {/* ── Header ── */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{todayStr}</p>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome back, <span className="text-primary">{user.name.split(" ")[0]}</span> 👋
              </h1>
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold ${karma.bg} ${karma.color}`}>
              <Star className="w-4 h-4 fill-current" />
              {karma.label} Member · {user.karma ?? 0} pts
            </div>
          </motion.div>

          {/* ── Stats row ── */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: <Ticket className="w-5 h-5 text-primary" />,      label: "Active Tokens",    value: activeBookings.length,  bg: "bg-primary/5" },
              { icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, label: "Completed",   value: completedCount,         bg: "bg-emerald-50" },
              { icon: <Zap className="w-5 h-5 text-amber-500" />,       label: "Karma Points",    value: user.karma ?? 0,        bg: "bg-amber-50" },
              { icon: <Bell className="w-5 h-5 text-rose-500" />,       label: "Unread Alerts",   value: unreadCount,            bg: "bg-rose-50" },
            ].map((stat) => (
              <div key={stat.label} className={`${stat.bg} rounded-2xl p-4 flex flex-col gap-2`}>
                <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center shadow-sm">
                  {stat.icon}
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* ── Active tokens ── */}
          <motion.div variants={fadeUp} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Ticket className="w-5 h-5 text-primary" />
                Active Tokens
              </h2>
              <button
                onClick={() => setLocation("/book")}
                className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
              >
                + Book new
              </button>
            </div>

            {bookingsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}
              </div>
            ) : activeBookings.length === 0 ? (
              <div
                onClick={() => setLocation("/book")}
                className="cursor-pointer flex items-center justify-between p-6 bg-muted/30 border-2 border-dashed border-border rounded-2xl hover:border-primary/40 hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Ticket className="w-6 h-6 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">No active tokens</p>
                    <p className="text-sm text-muted-foreground">Tap to book your spot now</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            ) : (
              <div className="space-y-3">
                {activeBookings.map((b) => (
                  <motion.div
                    key={b.id}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => setLocation(`/token/${b.id}`)}
                    className="cursor-pointer flex items-center gap-4 p-5 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                  >
                    <div className="w-14 h-14 rounded-xl bg-primary text-primary-foreground flex flex-col items-center justify-center shrink-0 shadow-sm">
                      <span className="text-[10px] font-semibold opacity-70 leading-none">TOKEN</span>
                      <span className="text-sm font-black leading-tight">{b.tokenNumber}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-foreground">{b.serviceName}</span>
                        {statusBadge(b.status)}
                        {b.priority !== "normal" && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                            Priority
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{b.branchName}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.timeSlot}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* ── Quick actions ── */}
          <motion.div variants={fadeUp} className="space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: <Ticket className="w-6 h-6" />,  label: "Book Token",     sub: "Reserve your spot",   path: "/book",          bg: "bg-primary text-primary-foreground", hover: "hover:bg-primary/90" },
                { icon: <Activity className="w-6 h-6" />, label: "Branch Pulse",   sub: "Live crowd levels",   path: "/branches",      bg: "bg-card border border-border",        hover: "hover:bg-muted/50 text-foreground" },
                { icon: <Shuffle className="w-6 h-6" />,  label: "Token Swap",     sub: "Trade your slot",     path: "/swap",          bg: "bg-card border border-border",        hover: "hover:bg-muted/50 text-foreground" },
                { icon: <Bell className="w-6 h-6" />,     label: "Notifications",  sub: `${unreadCount} unread`, path: "/notifications", bg: "bg-card border border-border",    hover: "hover:bg-muted/50 text-foreground" },
              ].map((a) => (
                <motion.button
                  key={a.label}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setLocation(a.path)}
                  className={`${a.bg} ${a.hover} rounded-2xl p-4 text-left transition-all shadow-sm hover:shadow-md flex flex-col gap-3`}
                >
                  <div className="opacity-90">{a.icon}</div>
                  <div>
                    <p className="font-bold text-sm leading-tight">{a.label}</p>
                    <p className="text-xs opacity-60 mt-0.5">{a.sub}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* ── Branch Pulse ── */}
            <motion.div variants={fadeUp} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Branch Pulse
                </h2>
                <button
                  onClick={() => setLocation("/branches")}
                  className="text-sm text-primary font-semibold hover:underline flex items-center gap-1"
                >
                  All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {branchesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {branches.slice(0, 4).map((br) => {
                    const p = pulseColor(br.pulseLevel);
                    return (
                      <button
                        key={br.id}
                        onClick={() => setLocation(`/branches/${br.id}`)}
                        className="w-full flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-primary/30 hover:bg-muted/30 transition-all text-left"
                      >
                        <div className={`w-2.5 h-2.5 rounded-full ${p.dot} shrink-0 ${br.pulseLevel === "hectic" ? "animate-pulse" : ""}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{br.name}</p>
                          <p className="text-xs text-muted-foreground">{br.queueLength} in queue · {br.avgWaitMinutes}m wait</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.bg} ${p.text}`}>
                          {p.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* ── Recent Notifications ── */}
            <motion.div variants={fadeUp} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white">
                      {unreadCount}
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => setLocation("/notifications")}
                  className="text-sm text-primary font-semibold hover:underline flex items-center gap-1"
                >
                  All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {notifications.length === 0 ? (
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl border border-dashed border-border">
                  <Bell className="w-8 h-8 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">No notifications yet. Book a token to get started!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.slice(0, 4).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => setLocation(n.bookingId ? `/token/${n.bookingId}` : "/notifications")}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all hover:shadow-sm ${
                        !n.read ? "bg-primary/5 border-primary/20" : "bg-card border-border hover:bg-muted/30"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">{notifIcon(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{n.body}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(n.createdAt)}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* ── Footer quick link ── */}
          <motion.div variants={fadeUp}>
            <button
              onClick={() => setLocation("/profile")}
              className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-2xl hover:border-primary/30 hover:bg-muted/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                  {user.name[0]}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground text-sm">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email} · {karma.label} member</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-primary transition-colors">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">View Profile</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </motion.div>

        </motion.div>
      </main>
    </div>
  );
}
