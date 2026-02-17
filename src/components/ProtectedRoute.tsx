import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase, getUserMetadata } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // Not logged in → go to login
        if (!session) {
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        // Get user role from user_roles table
        const metadata = await getUserMetadata();

        // Can't get metadata → go to login
        if (!metadata) {
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        // CLIENT user trying to access admin pages → redirect to their page
        if (metadata.role === "client") {
          const clientPath = `/client/${metadata.clientId}`;

          // If they're NOT already on their client page → redirect them!
          if (!location.pathname.startsWith(clientPath)) {
            setRedirectTo(clientPath);
            setIsAuthorized(false);
            setLoading(false);
            return;
          }
        }

        // requireAdmin check
        if (requireAdmin && metadata.role !== "admin") {
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setIsAuthorized(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [requireAdmin, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect client to their own page
  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  if (!isAuthorized) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
