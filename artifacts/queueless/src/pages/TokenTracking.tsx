import { AuthGate } from "@/components/layout/AuthGate";
import { Navbar } from "@/components/layout/Navbar";
import { useParams, useLocation } from "wouter";
import { 
  useTrackQueue, 
  useGetServiceChecklist, 
  useUpdateBookingChecklist,
  useCreateSwapListing,
  useCancelBooking
} from "@workspace/api-client-react";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Users, Clock, ArrowRight, AlertTriangle, Info, CheckCircle2, RefreshCw } from "lucide-react";

export default function TokenTracking() {
  const { bookingId } = useParams();
  const id = Number(bookingId);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: tracking, isLoading } = useTrackQueue(id, { query: { refetchInterval: 5000 } });
  const { data: checklist } = useGetServiceChecklist(tracking?.booking.serviceId || 0, {
    query: { enabled: !!tracking?.booking.serviceId }
  });

  const updateChecklist = useUpdateBookingChecklist();
  const createSwapListing = useCreateSwapListing();
  const cancelBooking = useCancelBooking();

  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const initChecklistRef = useRef(false);

  useEffect(() => {
    if (tracking && !initChecklistRef.current) {
      // In a real app we'd fetch the saved checklist items, for now start empty
      initChecklistRef.current = true;
    }
  }, [tracking]);

  const handleChecklistToggle = (key: string, checked: boolean) => {
    const newItems = checked ? [...completedItems, key] : completedItems.filter(k => k !== key);
    setCompletedItems(newItems);
    updateChecklist.mutate({ bookingId: id, data: { completedItems: newItems } });
  };

  const [swapNote, setSwapNote] = useState("");
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);

  const handleCreateSwap = () => {
    createSwapListing.mutate(
      { data: { bookingId: id, note: swapNote } },
      {
        onSuccess: () => {
          setSwapDialogOpen(false);
          toast({ title: "Swap listing created", description: "Your token is now available for swapping." });
          setLocation("/swap");
        }
      }
    );
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this booking?")) {
      cancelBooking.mutate(
        { bookingId: id },
        {
          onSuccess: () => {
            toast({ title: "Booking cancelled" });
            setLocation("/");
          }
        }
      );
    }
  };

  if (isLoading || !tracking) {
    return <div className="min-h-screen bg-background p-8" />;
  }

  const { booking, currentlyServing, peopleAhead, estimatedWaitMinutes, leaveNowAdvice, recentlyCompleted } = tracking;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "booked": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "waiting": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "serving": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "completed": return "bg-slate-500/10 text-slate-500 border-slate-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <AuthGate>
      <div className="min-h-[100dvh] flex flex-col bg-background pb-12">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl space-y-8">
          
          <div className="text-center space-y-4">
            <div className={`inline-block px-4 py-1 rounded-full border text-sm font-bold uppercase tracking-wider ${getStatusColor(booking.status)}`}>
              {booking.status}
            </div>
            
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="text-8xl sm:text-[120px] font-black text-primary leading-none tracking-tighter"
            >
              {booking.tokenNumber}
            </motion.div>
            
            <div className="text-xl font-medium text-foreground">
              {booking.serviceName} <span className="text-muted-foreground mx-2">•</span> {booking.branchName}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 text-center rounded-3xl border-card-border shadow-sm">
              <p className="text-sm text-muted-foreground mb-1 flex items-center justify-center gap-1"><ArrowRight className="w-3.5 h-3.5"/> Serving</p>
              <p className="text-2xl font-bold text-foreground">{currentlyServing || "-"}</p>
            </Card>
            <Card className="p-4 text-center rounded-3xl border-card-border shadow-sm">
              <p className="text-sm text-muted-foreground mb-1 flex items-center justify-center gap-1"><Users className="w-3.5 h-3.5"/> Ahead</p>
              <p className="text-2xl font-bold text-foreground">{peopleAhead}</p>
            </Card>
            <Card className="p-4 text-center rounded-3xl border-card-border shadow-sm">
              <p className="text-sm text-muted-foreground mb-1 flex items-center justify-center gap-1"><Clock className="w-3.5 h-3.5"/> Est Wait</p>
              <p className="text-2xl font-bold text-foreground">{estimatedWaitMinutes}m</p>
            </Card>
          </div>

          <Card className={`p-6 rounded-3xl border shadow-md ${leaveNowAdvice.includes("urgent") ? "bg-primary/10 border-primary/30" : "bg-card border-card-border"}`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full ${leaveNowAdvice.includes("urgent") ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {leaveNowAdvice.includes("urgent") ? <AlertTriangle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Leave Now Advice</h3>
                <p className="text-muted-foreground mt-1 leading-relaxed">{leaveNowAdvice}</p>
              </div>
            </div>
          </Card>

          {checklist && checklist.length > 0 && (
            <Card className="p-6 rounded-3xl border border-card-border shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-bold text-foreground">Pre-Visit Checklist</h3>
              </div>
              <div className="space-y-3">
                {checklist.map((item) => (
                  <div key={item.key} className="flex items-start space-x-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                    <Checkbox 
                      id={item.key} 
                      checked={completedItems.includes(item.key)}
                      onCheckedChange={(c) => handleChecklistToggle(item.key, !!c)}
                      className="mt-1"
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor={item.key} className="text-sm font-medium leading-none cursor-pointer">
                        {item.label} {item.required && <span className="text-destructive">*</span>}
                      </label>
                      {item.hint && <p className="text-xs text-muted-foreground">{item.hint}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {recentlyCompleted.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Recently Called</h4>
              <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                {recentlyCompleted.map((token, i) => (
                  <div key={i} className="flex-none px-4 py-2 bg-muted rounded-xl text-sm font-bold text-muted-foreground opacity-70">
                    {token}
                  </div>
                ))}
              </div>
            </div>
          )}

          {booking.status === "booked" || booking.status === "waiting" ? (
            <div className="pt-6 border-t border-border flex flex-col gap-4">
              <Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full rounded-xl py-6 text-lg">
                    <RefreshCw className="w-4 h-4 mr-2" /> List for Swap
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl">
                  <DialogHeader>
                    <DialogTitle>List Token for Swap</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                      Offer your token ({booking.tokenNumber}) to other users. You can include a note explaining what time you're looking for.
                    </p>
                    <Textarea 
                      placeholder="e.g. Looking to swap for an afternoon slot..."
                      value={swapNote}
                      onChange={(e) => setSwapNote(e.target.value)}
                      className="resize-none"
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateSwap} disabled={createSwapListing.isPending} className="rounded-xl w-full">
                      {createSwapListing.isPending ? "Listing..." : "Confirm Listing"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <button onClick={handleCancel} className="text-sm text-destructive hover:underline font-medium text-center">
                Cancel Booking
              </button>
            </div>
          ) : null}
          
        </main>
      </div>
    </AuthGate>
  );
}
