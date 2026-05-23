import { useState } from "react";
import { AuthGate } from "@/components/layout/AuthGate";
import { Navbar } from "@/components/layout/Navbar";
import { 
  useListBranches, 
  useGetBranchStats,
  useAdminQueueView,
  useCallNextToken,
  useUpdateBookingStatus,
  useListPendingSos,
  useApproveSos,
  useRejectSos,
  getAdminQueueViewQueryKey,
  getListPendingSosQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Users, Clock, Zap, MoreVertical, Play, Siren, ShieldCheck, ShieldX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function Admin() {
  const { data: branches, isLoading: branchesLoading } = useListBranches();
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  // Select first branch by default once loaded
  if (branches && branches.length > 0 && !selectedBranchId) {
    setSelectedBranchId(branches[0].id.toString());
  }

  const branchId = Number(selectedBranchId);
  const { data: stats } = useGetBranchStats(branchId, { query: { enabled: !!branchId } });
  const { data: queueView } = useAdminQueueView(branchId, { query: { enabled: !!branchId, refetchInterval: 3000 } });
  const { data: pendingSos = [] } = useListPendingSos(branchId, { query: { enabled: !!branchId, refetchInterval: 5000 } });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const callNext = useCallNextToken();
  const updateStatus = useUpdateBookingStatus();
  const approveSos = useApproveSos();
  const rejectSos = useRejectSos();

  const handleApproveSos = (sosId: number) => {
    approveSos.mutate({ sosId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPendingSosQueryKey(branchId) });
        queryClient.invalidateQueries({ queryKey: getAdminQueueViewQueryKey(branchId) });
        toast({ title: "SOS Approved", description: "Token moved to front of queue." });
      },
    });
  };

  const handleRejectSos = (sosId: number) => {
    rejectSos.mutate({ sosId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPendingSosQueryKey(branchId) });
        toast({ title: "SOS Rejected" });
      },
    });
  };

  const handleCallNext = () => {
    callNext.mutate(
      { branchId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminQueueViewQueryKey(branchId) });
          toast({ title: "Next token called" });
        },
        onError: () => toast({ variant: "destructive", title: "Failed to call next token" })
      }
    );
  };

  const handleUpdateStatus = (bookingId: number, status: 'serving' | 'completed' | 'no_show' | 'cancelled') => {
    updateStatus.mutate(
      { bookingId, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminQueueViewQueryKey(branchId) });
        }
      }
    );
  };

  return (
    <AuthGate requireStaff>
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-foreground">Staff Console</h1>
            {!branchesLoading && (
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="w-[250px] rounded-xl h-12 bg-card border-card-border shadow-sm">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches?.map(b => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {stats && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-6 rounded-3xl border-card-border shadow-sm flex items-center gap-4">
                <div className="p-4 rounded-full bg-primary/10 text-primary"><Users className="w-6 h-6" /></div>
                <div><p className="text-sm text-muted-foreground">Served Today</p><p className="text-2xl font-bold">{stats.servedToday}</p></div>
              </Card>
              <Card className="p-6 rounded-3xl border-card-border shadow-sm flex items-center gap-4">
                <div className="p-4 rounded-full bg-primary/10 text-primary"><Clock className="w-6 h-6" /></div>
                <div><p className="text-sm text-muted-foreground">Avg Service</p><p className="text-2xl font-bold">{stats.avgServiceMinutes}m</p></div>
              </Card>
              <Card className="p-6 rounded-3xl border-card-border shadow-sm flex items-center gap-4">
                <div className="p-4 rounded-full bg-primary/10 text-primary"><Zap className="w-6 h-6" /></div>
                <div><p className="text-sm text-muted-foreground">Throughput</p><p className="text-2xl font-bold">{stats.throughputPerHour}/hr</p></div>
              </Card>
              <Card className="p-6 rounded-3xl border-card-border shadow-sm flex items-center gap-4">
                <div className="p-4 rounded-full bg-primary/10 text-primary"><Activity className="w-6 h-6" /></div>
                <div><p className="text-sm text-muted-foreground">Peak Hour</p><p className="text-2xl font-bold">{stats.peakHour}</p></div>
              </Card>
            </div>
          )}

          {stats && stats.hourlyDistribution.length > 0 && (
            <Card className="p-6 rounded-3xl border-card-border shadow-sm">
              <h3 className="text-lg font-bold mb-6">Today's Traffic</h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.hourlyDistribution}>
                    <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis hide />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 4, 4]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* SOS Emergency Panel */}
          <AnimatePresence>
            {pendingSos.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              >
                <Card className="p-6 rounded-3xl border-2 border-rose-400 bg-rose-50 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-rose-600 flex items-center justify-center animate-pulse">
                      <Siren className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-rose-800">SOS Emergency Requests</h3>
                      <p className="text-xs text-rose-600">{pendingSos.length} pending — requires your action</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {pendingSos.map((s) => (
                      <div key={s.id} className="bg-white rounded-2xl border border-rose-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-black text-foreground text-lg">{s.tokenNumber}</span>
                            <span className="text-sm font-medium text-muted-foreground">{s.userName}</span>
                            <span className="text-xs text-muted-foreground">· {s.timeSlot}</span>
                          </div>
                          <p className="text-sm text-rose-800 font-medium leading-snug">"{s.reason}"</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleApproveSos(s.id)}
                            disabled={approveSos.isPending}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors shadow-sm"
                          >
                            <ShieldCheck className="w-4 h-4" /> Approve
                          </button>
                          <button
                            onClick={() => handleRejectSos(s.id)}
                            disabled={rejectSos.isPending}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-colors shadow-sm"
                          >
                            <ShieldX className="w-4 h-4" /> Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {queueView && (
            <div className="grid lg:grid-cols-3 gap-6">
              
              {/* NOW SERVING */}
              <Card className="p-6 rounded-3xl border-primary/20 shadow-md bg-primary/5 flex flex-col h-[600px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-primary flex items-center gap-2"><Play className="w-5 h-5"/> Now Serving</h3>
                  <span className="px-2 py-1 bg-primary/20 text-primary font-bold rounded-lg text-sm">{queueView.nowServing.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 hide-scrollbar">
                  {queueView.nowServing.map(b => (
                    <div key={b.id} className="bg-card p-4 rounded-2xl border border-primary/10 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-3xl font-black text-foreground leading-none mb-1">{b.tokenNumber}</p>
                        <p className="text-sm font-medium text-muted-foreground">{b.serviceName}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => handleUpdateStatus(b.id, 'completed')}>Complete</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(b.id, 'no_show')} className="text-destructive">Mark No Show</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                  {queueView.nowServing.length === 0 && (
                    <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">No tokens currently serving.</div>
                  )}
                </div>
              </Card>

              {/* UP NEXT */}
              <Card className="p-6 rounded-3xl border-card-border shadow-sm flex flex-col h-[600px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Up Next</h3>
                  <span className="px-2 py-1 bg-muted font-bold rounded-lg text-sm">{queueView.upcoming.length}</span>
                </div>
                <Button onClick={handleCallNext} disabled={callNext.isPending || queueView.upcoming.length === 0} className="w-full rounded-xl py-6 text-lg font-bold mb-4 shadow-sm">
                  Call Next Token
                </Button>
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 hide-scrollbar">
                  {queueView.upcoming.map((b, i) => (
                    <div key={b.id} className={`p-4 rounded-2xl border ${i===0 ? "border-primary/30 bg-primary/5" : "border-border bg-card"} flex items-center justify-between`}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xl font-bold text-foreground leading-none">{b.tokenNumber}</p>
                          {b.priority && b.priority !== "normal" && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold uppercase tracking-wider">
                              {b.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{b.serviceName} • {b.timeSlot}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => handleUpdateStatus(b.id, 'serving')}>Call Specifically</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(b.id, 'no_show')} className="text-destructive">Mark No Show</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(b.id, 'cancelled')} className="text-destructive">Cancel</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                  {queueView.upcoming.length === 0 && (
                    <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">Queue is empty.</div>
                  )}
                </div>
              </Card>

              {/* COMPLETED */}
              <Card className="p-6 rounded-3xl border-card-border shadow-sm flex flex-col h-[600px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-muted-foreground">Completed Today</h3>
                  <span className="px-2 py-1 bg-muted font-bold rounded-lg text-sm text-muted-foreground">{queueView.completedToday.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-2 hide-scrollbar">
                  {queueView.completedToday.map(b => (
                    <div key={b.id} className="p-3 rounded-xl border border-border bg-muted/30 flex items-center justify-between opacity-70">
                      <p className="font-bold text-muted-foreground">{b.tokenNumber}</p>
                      <p className="text-xs text-muted-foreground capitalize">{b.status.replace('_', ' ')}</p>
                    </div>
                  ))}
                </div>
              </Card>

            </div>
          )}

        </main>
      </div>
    </AuthGate>
  );
}
