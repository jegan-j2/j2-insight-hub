import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login", { replace: true });
      } else {
        // User is logged in, redirect based on role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role, client_id")
          .eq("user_id", session.user.id)
          .single();

        if (roleData?.role === "client" && roleData.client_id) {
          navigate(`/client/${roleData.client_id}`, { replace: true });
        } else {
          navigate("/overview", { replace: true });
        }
      }
      setChecking(false);
    };
    checkSession();
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  return null;
};

export default Index;
