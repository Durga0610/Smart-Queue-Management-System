import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

interface AuthGateProps {
  children: ReactNode;
  requireStaff?: boolean;
}

export function AuthGate({ children, requireStaff }: AuthGateProps) {
  const [, setLocation] = useLocation();
  const { data: user, isLoading, isError } = useGetMe();

  useEffect(() => {
    if (!isLoading && (isError || !user)) {
      setLocation("/login");
    }
  }, [isLoading, isError, user, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !user) {
    setLocation("/login");
    return null;
  }

  if (requireStaff && user.role !== "staff") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-card border border-card-border p-8 rounded-2xl text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Staff Only</h2>
          <p className="text-muted-foreground">
            This area is restricted to branch staff.
          </p>
          <div className="bg-muted/50 p-4 rounded-xl text-left space-y-2 mt-4">
            <p className="text-sm font-medium text-foreground">Demo Credentials:</p>
            <p className="text-sm text-muted-foreground font-mono bg-background p-2 rounded border border-border">
              staff@queueless.app / staff123
            </p>
          </div>
          <button
            onClick={() => setLocation("/")}
            className="w-full bg-primary text-primary-foreground h-10 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
