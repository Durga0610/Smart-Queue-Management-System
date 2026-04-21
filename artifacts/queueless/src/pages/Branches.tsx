import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { useListBranches, BranchPulse } from "@workspace/api-client-react";
import { MapPin, Users, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function Branches() {
  const [, setLocation] = useLocation();
  const { data: branches, isLoading } = useListBranches();

  const getPulseColor = (level: BranchPulse["pulseLevel"]) => {
    switch (level) {
      case "calm": return "bg-emerald-500";
      case "moderate": return "bg-amber-500";
      case "busy": return "bg-orange-500";
      case "packed": return "bg-rose-500";
      default: return "bg-primary";
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Branch Pulse</h1>
          <p className="text-muted-foreground">Live wait times and crowd levels.</p>
        </header>

        <div className="flex flex-wrap gap-4 text-sm bg-card p-4 rounded-2xl border border-card-border">
          <span className="font-medium mr-2">Pulse Levels:</span>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Calm</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /> Moderate</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500" /> Busy</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500" /> Packed</div>
        </div>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-3xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6">
            {branches?.map((branch) => (
              <div
                key={branch.id}
                onClick={() => setLocation(`/branches/${branch.id}`)}
                className="cursor-pointer bg-card border border-card-border p-6 rounded-3xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-foreground">{branch.name}</h2>
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border">
                        <motion.div
                          className={`w-2.5 h-2.5 rounded-full ${getPulseColor(branch.pulseLevel)}`}
                          animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <span className="text-xs font-semibold uppercase tracking-wider">
                          {branch.pulseLevel}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <MapPin className="w-4 h-4" />
                      {branch.address}, {branch.city}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <div className="space-y-1 text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm">
                        <Users className="w-4 h-4" /> Queue
                      </div>
                      <div className="font-bold text-lg text-foreground">{branch.queueLength}</div>
                    </div>
                    <div className="space-y-1 text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm">
                        <Clock className="w-4 h-4" /> Wait
                      </div>
                      <div className="font-bold text-lg text-foreground">{branch.avgWaitMinutes}m</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
