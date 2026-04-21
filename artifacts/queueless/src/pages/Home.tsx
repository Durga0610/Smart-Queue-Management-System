import { useEffect } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { useGetMe, useListMyBookings } from "@workspace/api-client-react";
import { ArrowRight, Ticket, Clock, MapPin, Activity, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function Home() {
  const [, setLocation] = useLocation();
  const meQuery = useGetMe();
  const user = meQuery.data;
  const isStaff = user?.role === "staff";

  const bookingsQuery = useListMyBookings({
    query: { enabled: !!user && user.role === "customer" },
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

  const bookings = bookingsQuery.data;
  const activeBookings = bookings?.filter(
    (b) => b.status === "booked" || b.status === "waiting" || b.status === "serving"
  );

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl space-y-12">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Welcome back, {user.name}</h1>
          <p className="text-muted-foreground">Ready to save some time today?</p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div
            onClick={() => setLocation("/book")}
            className="group cursor-pointer rounded-3xl bg-primary text-primary-foreground p-8 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity group-hover:scale-110 duration-500">
              <Ticket className="w-32 h-32" />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Ticket className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold">Book a token</h2>
              <p className="text-primary-foreground/80 pr-12">
                Reserve your spot in line before you even leave home.
              </p>
            </div>
          </div>

          <div
            onClick={() => setLocation("/branches")}
            className="group cursor-pointer rounded-3xl bg-card border border-card-border p-8 shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Branch Pulse</h2>
              <p className="text-muted-foreground">
                Check live wait times and crowd levels before you go.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground">Your Active Tokens</h3>
          </div>

          {bookingsQuery.isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 bg-muted rounded-2xl" />
              ))}
            </div>
          ) : !activeBookings || activeBookings.length === 0 ? (
            <div className="text-center p-12 bg-muted/30 border border-dashed border-border rounded-3xl">
              <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg text-foreground font-medium mb-2">No active tokens</p>
              <p className="text-muted-foreground mb-6">You're all caught up for today.</p>
              <button
                onClick={() => setLocation("/book")}
                className="text-primary font-medium hover:underline inline-flex items-center gap-1"
              >
                Book now <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeBookings.map((booking) => (
                <div
                  key={booking.id}
                  onClick={() => setLocation(`/token/${booking.id}`)}
                  className="cursor-pointer group flex items-center justify-between p-6 bg-card border border-card-border rounded-2xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start gap-6">
                    <div className="hidden sm:flex flex-col items-center justify-center w-16 h-16 bg-primary/10 rounded-xl text-primary font-bold text-xl">
                      {booking.tokenNumber}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg text-foreground">{booking.serviceName}</h4>
                        <span className="sm:hidden px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-md">
                          {booking.tokenNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {booking.branchName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(booking.bookingDate), "MMM d")} • {booking.timeSlot}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
