import { AuthGate } from "@/components/layout/AuthGate";
import { Navbar } from "@/components/layout/Navbar";
import { useGetMe, useLogoutUser, getGetMeQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const { data: user } = useGetMe();
  const logout = useLogoutUser();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  if (!user) return null;

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setLocation("/");
      },
    });
  };

  const karma = user.karma || 0;
  const progress = Math.min(100, Math.max(0, karma));

  return (
    <AuthGate>
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Your Profile</h1>
          </header>

          <div className="bg-card border border-card-border p-8 rounded-3xl shadow-sm space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-foreground">{user.name}</h2>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="inline-block mt-2 px-3 py-1 bg-muted rounded-full text-xs font-semibold uppercase tracking-wider">
                Role: {user.role}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg">Karma Score</h3>
                </div>
                <span className="font-bold text-2xl text-primary">{karma}</span>
              </div>
              
              <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-primary transition-all duration-1000 ease-out rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground font-medium px-1">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>

              <p className="text-sm text-muted-foreground bg-primary/5 p-4 rounded-xl">
                Show up on time to earn priority. 70+ unlocks priority booking.
              </p>
            </div>
          </div>

          <Button variant="destructive" className="w-full rounded-xl py-6 text-lg" onClick={handleLogout} disabled={logout.isPending}>
            <LogOut className="w-5 h-5 mr-2" /> {logout.isPending ? "Logging out..." : "Log out"}
          </Button>
        </main>
      </div>
    </AuthGate>
  );
}
