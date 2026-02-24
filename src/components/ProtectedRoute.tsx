import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { J2Loader } from "@/components/J2Loader";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [redirectPath, setRedirectPath] = useState<string>("");
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // Not logged in → go to login
        if (!session) {
          setRedirectPath("/login");
          setLoading(false);
          return;
        }

        // Get role directly from user_roles table
        const { data: roleData, error } = await supabase
          .from("user_roles")
          .select("role, client_id")
          .eq("user_id", session.user.id)
          .single();

        if (import.meta.env.DEV) console.log("🔍 ProtectedRoute role:", roleData, "Error:", error);

        // Can't get role → go to login
        if (error || !roleData) {
          setRedirectPath("/login");
          setLoading(false);
          return;
        }

        // CLIENT user → enforce their own page only!
        if (roleData.role === "client" && roleData.client_id) {
          const clientPath = `/client/${roleData.client_id}`;
          if (!location.pathname.startsWith(clientPath)) {
            if (import.meta.env.DEV) console.log(`🔒 Client redirected to ${clientPath}`);
            setRedirectPath(clientPath);
            setLoading(false);
            return;
          }
        }

        // requireAdmin check
        if (requireAdmin && roleData.role !== "admin") {
          setRedirectPath("/login");
          setLoading(false);
          return;
        }

        // All good!
        setRedirectPath("");
      } catch (error) {
        console.error("Auth check error:", error);
        setRedirectPath("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setRedirectPath("/login");
    });

    return () => subscription.unsubscribe();
  }, [requireAdmin, location.pathname]);

  if (loading) {
    return <J2Loader />;
  }

  // Redirect if needed
  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};
