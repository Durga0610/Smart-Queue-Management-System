import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { AuthGate } from "@/components/layout/AuthGate";
import { Navbar } from "@/components/layout/Navbar";
import { 
  useListBranches, 
  useListServices, 
  useGetSmartSlots, 
  useCreateBooking,
  getListMyBookingsQueryKey,
  BranchPulse
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, addDays, startOfToday } from "date-fns";
import { MapPin, Clock, ArrowRight, Activity, Calendar as CalendarIcon, CheckCircle2, Heart, Accessibility, User } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function Book() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [branchId, setBranchId] = useState<number | undefined>(params.get("branchId") ? Number(params.get("branchId")) : undefined);
  const [serviceId, setServiceId] = useState<number | undefined>(params.get("serviceId") ? Number(params.get("serviceId")) : undefined);
  const [date, setDate] = useState<Date | undefined>(addDays(startOfToday(), 1));
  const [timeSlot, setTimeSlot] = useState<string | undefined>();
  const [priority, setPriority] = useState<"normal" | "senior" | "pregnant" | "disabled">("normal");

  const { data: branches, isLoading: branchesLoading } = useListBranches();
  const { data: services, isLoading: servicesLoading } = useListServices();
  
  const formattedDate = date ? format(date, "yyyy-MM-dd") : "";
  const { data: slots, isLoading: slotsLoading } = useGetSmartSlots(
    { branchId: branchId as number, serviceId: serviceId as number, date: formattedDate },
    { query: { enabled: !!branchId && !!serviceId && !!date && step === 4 } }
  );

  const createBooking = useCreateBooking();

  useEffect(() => {
    if (branchId && step === 1) setStep(2);
    if (serviceId && step === 2) setStep(3);
  }, [branchId, serviceId]);

  const handleBook = () => {
    if (!branchId || !serviceId || !date || !timeSlot) return;

    createBooking.mutate(
      {
        data: {
          branchId,
          serviceId,
          bookingDate: formattedDate,
          timeSlot,
          priority,
        }
      },
      {
        onSuccess: (booking) => {
          queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
          toast({ title: "Booking confirmed!" });
          setLocation(`/token/${booking.id}`);
        },
        onError: () => {
          toast({ variant: "destructive", title: "Booking failed", description: "Please try again." });
        }
      }
    );
  };

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
    <AuthGate>
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Book a Token</h1>
            <p className="text-muted-foreground">Reserve your spot in line.</p>
          </header>

          <div className="flex items-center justify-between mb-8 relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted -z-10 rounded-full" />
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 rounded-full transition-all duration-300"
              style={{ width: `${((step - 1) / 4) * 100}%` }}
            />
            {[1, 2, 3, 4, 5].map((s) => (
              <div 
                key={s} 
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${
                  step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
            ))}
          </div>

          <div className="bg-card border border-card-border p-6 md:p-8 rounded-3xl shadow-sm min-h-[400px]">
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold">Select Branch</h2>
                {branchesLoading ? (
                  <div className="space-y-4 animate-pulse">
                    {[1, 2].map((i) => <div key={i} className="h-20 bg-muted rounded-2xl" />)}
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {branches?.map((branch) => (
                      <button
                        key={branch.id}
                        onClick={() => { setBranchId(branch.id); setStep(2); }}
                        className={`text-left flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          branchId === branch.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-card-border hover:border-primary/50"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{branch.name}</span>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted border border-border text-[10px] font-bold uppercase">
                              <motion.div
                                className={`w-2 h-2 rounded-full ${getPulseColor(branch.pulseLevel)}`}
                                animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                              {branch.pulseLevel}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3.5 h-3.5" /> {branch.address}
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <Button variant="outline" size="sm" onClick={() => setStep(1)}>Back</Button>
                  <h2 className="text-xl font-bold">Select Service</h2>
                </div>
                {servicesLoading ? (
                  <div className="space-y-4 animate-pulse">
                    {[1, 2].map((i) => <div key={i} className="h-20 bg-muted rounded-2xl" />)}
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {services?.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => { setServiceId(service.id); setStep(3); }}
                        className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between h-32 ${
                          serviceId === service.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-card-border hover:border-primary/50"
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="font-bold block">{service.name}</span>
                          <span className="text-sm text-muted-foreground line-clamp-2">{service.description}</span>
                        </div>
                        <span className="text-sm font-medium text-primary flex items-center gap-1 mt-2">
                          <Clock className="w-4 h-4" /> {service.avgDurationMinutes} min
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 flex flex-col items-center">
                <div className="flex items-center gap-4 w-full justify-start">
                  <Button variant="outline" size="sm" onClick={() => setStep(2)}>Back</Button>
                  <h2 className="text-xl font-bold">Select Date</h2>
                </div>
                <div className="bg-card border border-border p-4 rounded-2xl inline-block shadow-sm">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => { if (d) setDate(d); }}
                    disabled={(d) => d < startOfToday() || d > addDays(startOfToday(), 14)}
                    className="rounded-md"
                  />
                </div>
                <div className="w-full flex justify-end">
                  <Button onClick={() => setStep(4)} disabled={!date} className="rounded-xl px-8">
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <Button variant="outline" size="sm" onClick={() => setStep(3)}>Back</Button>
                  <h2 className="text-xl font-bold">Select Time</h2>
                </div>
                {slotsLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">
                    {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-24 bg-muted rounded-2xl" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {slots?.map((slot) => (
                      <button
                        key={slot.timeSlot}
                        onClick={() => { setTimeSlot(slot.timeSlot); setStep(5); }}
                        className={`relative text-center p-4 rounded-2xl border transition-all ${
                          timeSlot === slot.timeSlot ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-card-border hover:border-primary/50"
                        }`}
                      >
                        {slot.recommended && (
                          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
                            Recommended
                          </div>
                        )}
                        <span className="font-bold text-lg block">{slot.timeSlot}</span>
                        <span className="text-xs text-muted-foreground block mt-1">{slot.label}</span>
                        <span className="text-xs font-medium text-primary block mt-1">Wait: {slot.expectedWaitMinutes}m</span>
                      </button>
                    ))}
                    {slots?.length === 0 && (
                      <div className="col-span-full py-12 text-center text-muted-foreground">
                        No slots available for this date.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <Button variant="outline" size="sm" onClick={() => setStep(4)}>Back</Button>
                  <h2 className="text-xl font-bold">Confirm Booking</h2>
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm font-bold text-foreground">Priority Assistance</p>
                  <p className="text-xs text-muted-foreground">Select if you qualify — priority guests are called ahead.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {([
                      { key: "normal", label: "Standard", icon: User },
                      { key: "senior", label: "Senior 60+", icon: Heart },
                      { key: "pregnant", label: "Pregnant", icon: Heart },
                      { key: "disabled", label: "Disabled", icon: Accessibility },
                    ] as const).map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPriority(key)}
                        className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                          priority === key
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-card-border hover:border-primary/50"
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${priority === key ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-xs font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-muted/30 border border-border rounded-2xl p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Branch</p>
                      <p className="font-bold text-lg">{branches?.find(b => b.id === branchId)?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Activity className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Service</p>
                      <p className="font-bold text-lg">{services?.find(s => s.id === serviceId)?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <CalendarIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date & Time</p>
                      <p className="font-bold text-lg">{date ? format(date, "MMMM d, yyyy") : ""} at {timeSlot}</p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleBook} 
                  disabled={createBooking.isPending} 
                  className="w-full rounded-xl py-6 text-lg font-bold shadow-lg"
                >
                  {createBooking.isPending ? "Confirming..." : "Confirm Booking"}
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGate>
  );
}
