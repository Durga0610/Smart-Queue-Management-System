import { useState } from "react";
import { AuthGate } from "@/components/layout/AuthGate";
import { Navbar } from "@/components/layout/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  useListSwapOffers, 
  useListMySwapOffers, 
  useListMyBookings,
  useAcceptSwap,
  useCancelSwapListing,
  getListSwapOffersQueryKey,
  getListMySwapOffersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { RefreshCw, ArrowRightLeft, Clock, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Swap() {
  const { data: offers, isLoading: offersLoading } = useListSwapOffers();
  const { data: myOffers, isLoading: myOffersLoading } = useListMySwapOffers();
  const { data: myBookings } = useListMyBookings();
  
  const acceptSwap = useAcceptSwap();
  const cancelListing = useCancelSwapListing();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedListingId, setSelectedListingId] = useState<number | null>(null);
  const [selectedMyBookingId, setSelectedMyBookingId] = useState<string>("");

  const eligibleBookings = myBookings?.filter(b => b.status === "booked" || b.status === "waiting") || [];

  const handleAccept = () => {
    if (!selectedListingId || !selectedMyBookingId) return;
    
    acceptSwap.mutate(
      { listingId: selectedListingId, data: { myBookingId: Number(selectedMyBookingId) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSwapOffersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListMySwapOffersQueryKey() });
          toast({ title: "Swap successful!" });
          setSelectedListingId(null);
          setSelectedMyBookingId("");
        },
        onError: () => toast({ variant: "destructive", title: "Swap failed" })
      }
    );
  };

  const handleCancelListing = (id: number) => {
    cancelListing.mutate(
      { listingId: id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSwapOffersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListMySwapOffersQueryKey() });
          toast({ title: "Listing removed" });
        }
      }
    );
  };

  return (
    <AuthGate>
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Token Swap</h1>
            <p className="text-muted-foreground">Trade your queue position with others.</p>
          </header>

          <Tabs defaultValue="available" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl p-1 bg-muted/50 mb-6">
              <TabsTrigger value="available" className="rounded-lg">Available Swaps</TabsTrigger>
              <TabsTrigger value="mine" className="rounded-lg">My Listings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="available" className="space-y-4 focus-visible:outline-none">
              {offersLoading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2].map(i => <div key={i} className="h-32 bg-muted rounded-2xl" />)}
                </div>
              ) : offers?.length === 0 ? (
                <div className="text-center p-12 bg-muted/30 border border-dashed rounded-3xl">
                  <RefreshCw className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium text-foreground">No swaps available</p>
                  <p className="text-muted-foreground">Check back later.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {offers?.map((offer) => (
                    <Card key={offer.id} className="p-6 rounded-2xl border-card-border shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-primary/10 text-primary font-bold rounded-lg text-sm">
                              {offer.tokenNumber}
                            </span>
                            <span className="font-bold">{offer.serviceName}</span>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {offer.branchName}</p>
                            <p className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {format(new Date(offer.bookingDate), "MMM d")} • {offer.timeSlot}
                            </p>
                            <p className="text-foreground mt-2">"{offer.note || "No note provided"}"</p>
                            <p className="text-xs italic">— {offer.ownerName}</p>
                          </div>
                        </div>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button onClick={() => setSelectedListingId(offer.id)} className="rounded-xl w-full sm:w-auto">
                              Trade <ArrowRightLeft className="w-4 h-4 ml-2" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="rounded-3xl">
                            <DialogHeader>
                              <DialogTitle>Trade with {offer.ownerName}</DialogTitle>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                              <p className="text-sm text-muted-foreground">Select one of your active tokens to trade for {offer.tokenNumber}:</p>
                              {eligibleBookings.length === 0 ? (
                                <p className="text-sm text-destructive font-medium p-4 bg-destructive/10 rounded-xl">
                                  You don't have any active tokens available to trade.
                                </p>
                              ) : (
                                <Select value={selectedMyBookingId} onValueChange={setSelectedMyBookingId}>
                                  <SelectTrigger className="w-full h-12 rounded-xl">
                                    <SelectValue placeholder="Select your token..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {eligibleBookings.map(b => (
                                      <SelectItem key={b.id} value={b.id.toString()}>
                                        {b.tokenNumber} - {b.serviceName} ({b.timeSlot})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                            <DialogFooter>
                              <Button 
                                onClick={handleAccept} 
                                disabled={!selectedMyBookingId || acceptSwap.isPending}
                                className="w-full rounded-xl"
                              >
                                {acceptSwap.isPending ? "Swapping..." : "Confirm Swap"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="mine" className="space-y-4 focus-visible:outline-none">
              {myOffersLoading ? (
                <div className="space-y-4 animate-pulse">
                  {[1].map(i => <div key={i} className="h-32 bg-muted rounded-2xl" />)}
                </div>
              ) : myOffers?.length === 0 ? (
                <div className="text-center p-12 bg-muted/30 border border-dashed rounded-3xl">
                  <p className="text-lg font-medium text-foreground">You have no active listings</p>
                  <p className="text-muted-foreground">List a token from the tracking page to see it here.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {myOffers?.map((offer) => (
                    <Card key={offer.id} className="p-6 rounded-2xl border-card-border shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-primary/10 text-primary font-bold rounded-lg text-sm">
                              {offer.tokenNumber}
                            </span>
                            <span className="font-bold">{offer.serviceName}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{offer.note}</p>
                        </div>
                        <Button 
                          variant="destructive" 
                          className="rounded-xl w-full sm:w-auto"
                          onClick={() => handleCancelListing(offer.id)}
                          disabled={cancelListing.isPending}
                        >
                          Cancel Listing
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </AuthGate>
  );
}
