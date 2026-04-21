import { Link } from "wouter";
import { useGetMe, useLogoutUser, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, User, Activity, LayoutDashboard, Shuffle } from "lucide-react";

export function Navbar() {
  const { data: user } = useGetMe();
  const logout = useLogoutUser();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
    });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary font-bold text-lg hover:opacity-80 transition-opacity">
          <Activity className="w-6 h-6" />
          <span>QueueLess</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link href="/branches" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Pulse
          </Link>
          
          {user ? (
            <>
              {user.role === "customer" && (
                <Link href="/swap" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Shuffle className="w-4 h-4" />
                  Swap
                </Link>
              )}
              {user.role === "staff" && (
                <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <LayoutDashboard className="w-4 h-4" />
                  Console
                </Link>
              )}
              <div className="h-6 w-px bg-border mx-2" />
              <Link href="/profile" className="flex items-center gap-2 text-sm font-medium text-foreground hover:opacity-80">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <span className="hidden sm:inline">{user.name}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive transition-colors p-2"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium text-foreground hover:opacity-80">
                Log in
              </Link>
              <Link href="/register" className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-full hover:bg-primary/90 transition-colors shadow-sm">
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
