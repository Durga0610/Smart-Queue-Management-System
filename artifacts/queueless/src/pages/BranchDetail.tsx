import { useLocation, useParams } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { useGetBranch, useListServices, useGetBranchHeatmap, BranchPulse, HeatmapCell } from "@workspace/api-client-react";
import { MapPin, Clock, ArrowRight, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

export default function BranchDetail() {
  const { branchId } = useParams();
  const [, setLocation] = useLocation();
  const { data: branch, isLoading: branchLoading } = useGetBranch(Number(branchId), {
    query: { enabled: !!branchId }
  });
  const { data: services, isLoading: servicesLoading } = useListServices();
  const { data: heatmap } = useGetBranchHeatmap(Number(branchId), {
    query: { enabled: !!branchId }
  });

  if (branchLoading || servicesLoading) return <div className="min-h-screen bg-background p-8" />;
  if (!branch) return null;

  const getPulseColor = (level: BranchPulse["pulseLevel"]) => {
    switch (level) {
      case "calm": return "bg-emerald-500";
      case "moderate": return "bg-amber-500";
      case "busy": return "bg-orange-500";
      case "packed": return "bg-rose-500";
      default: return "bg-primary";
    }
  };

  const getCellBg = (level: HeatmapCell["level"], opacity = false) => {
    switch (level) {
      case "calm":     return opacity ? "bg-emerald-100 text-emerald-800" : "bg-emerald-400";
      case "moderate": return opacity ? "bg-amber-100 text-amber-800"   : "bg-amber-400";
      case "busy":     return opacity ? "bg-orange-100 text-orange-800"  : "bg-orange-400";
      case "packed":   return opacity ? "bg-rose-100 text-rose-800"     : "bg-rose-500";
      default:         return opacity ? "bg-muted text-muted-foreground" : "bg-muted";
    }
  };

  const getBestHour = () => {
    if (!heatmap) return null;
    const today = heatmap.find(r => r.isToday) ?? heatmap[0];
    if (!today) return null;
    const best = today.cells.reduce((a, b) => a.bookingCount <= b.bookingCount ? a : b);
    return { label: best.label, day: today.shortDay };
  };

  const bestTime = getBestHour();

  const hours = heatmap?.[0]?.cells.map(c => c.label) ?? [];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl space-y-8">

        {/* Branch header */}
        <section className="bg-card border border-card-border p-8 rounded-3xl shadow-sm text-center relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted border border-border">
              <motion.div
                className={`w-3 h-3 rounded-full ${getPulseColor(branch.pulseLevel)}`}
                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-sm font-bold uppercase tracking-widest">{branch.pulseLevel}</span>
            </div>

            <div>
              <h1 className="text-4xl font-bold text-foreground">{branch.name}</h1>
              <p className="text-muted-foreground flex items-center justify-center gap-1 mt-2">
                <MapPin className="w-4 h-4" /> {branch.address}, {branch.city}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-8 pt-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Queue Length</p>
                <p className="text-3xl font-bold text-foreground">{branch.queueLength}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Est. Wait</p>
                <p className="text-3xl font-bold text-foreground">{branch.avgWaitMinutes}m</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Open Counters</p>
                <p className="text-3xl font-bold text-foreground">{branch.openCounters}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Best Time Heatmap */}
        {heatmap && heatmap.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Best Time to Visit</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Typical crowd levels by hour — pick the green window</p>
              </div>
              {bestTime && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <TrendingDown className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-sm font-bold text-emerald-800">Quietest today: {bestTime.label}</span>
                </div>
              )}
            </div>

            <Card className="p-5 rounded-3xl border border-card-border shadow-sm overflow-x-auto">
              {/* Hour header */}
              <div className="grid mb-2" style={{ gridTemplateColumns: `56px repeat(${hours.length}, 1fr)` }}>
                <div />
                {hours.map(h => (
                  <div key={h} className="text-center text-[10px] font-bold text-muted-foreground uppercase">{h}</div>
                ))}
              </div>

              {/* Day rows */}
              <div className="space-y-1.5">
                {heatmap.map((row) => (
                  <div
                    key={row.day}
                    className="grid items-center gap-1"
                    style={{ gridTemplateColumns: `56px repeat(${row.cells.length}, 1fr)` }}
                  >
                    <div className={`text-xs font-bold text-right pr-2 ${row.isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {row.shortDay}{row.isToday ? " ·" : ""}
                    </div>
                    {row.cells.map((cell) => (
                      <div
                        key={cell.hour}
                        title={`${row.day} ${cell.label}: ${cell.level} (${cell.bookingCount} bookings)`}
                        className={`h-8 rounded-lg transition-all cursor-default ${getCellBg(cell.level)} ${row.isToday ? "ring-1 ring-primary/30" : ""}`}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 flex-wrap">
                <span className="text-xs text-muted-foreground font-medium">Crowd level:</span>
                {(["calm", "moderate", "busy", "packed"] as const).map(level => (
                  <div key={level} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded ${getCellBg(level)}`} />
                    <span className="text-xs text-muted-foreground capitalize">{level}</span>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        )}

        {/* Services */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Services Available</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {services?.map((service) => (
              <div key={service.id} className="bg-card border border-card-border p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                <div className="space-y-2 mb-6">
                  <h3 className="font-bold text-lg text-foreground">{service.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                  <p className="text-sm text-primary font-medium flex items-center gap-1">
                    <Clock className="w-4 h-4" /> ~{service.avgDurationMinutes} mins
                  </p>
                </div>
                <button
                  onClick={() => setLocation(`/book?branchId=${branch.id}&serviceId=${service.id}`)}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  Book Here <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
