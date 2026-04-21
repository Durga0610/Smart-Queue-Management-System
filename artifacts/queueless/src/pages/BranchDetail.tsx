import { useLocation, useParams } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { useGetBranch, useListServices, BranchPulse } from "@workspace/api-client-react";
import { MapPin, Clock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function BranchDetail() {
  const { branchId } = useParams();
  const [, setLocation] = useLocation();
  const { data: branch, isLoading: branchLoading } = useGetBranch(Number(branchId), {
    query: { enabled: !!branchId }
  });
  const { data: services, isLoading: servicesLoading } = useListServices();

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

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl space-y-8">
        
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
