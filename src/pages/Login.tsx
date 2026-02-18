import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const redirectBasedOnRole = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log("🔍 Login - getUser result:", user, "Error:", userError);

    if (!user) {
      console.error("No user found after login");
      return;
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role, client_id")
      .eq("user_id", user.id)
      .single();

    console.log("🔍 Login - role data:", roleData, "Error:", roleError);

    if (roleError || !roleData) {
      console.error("Could not fetch user role:", roleError);
      navigate("/overview");
      return;
    }

    if (roleData.role === "client" && roleData.client_id) {
      console.log(`🔒 Redirecting client to /client/${roleData.client_id}`);
      navigate(`/client/${roleData.client_id}`);
    } else {
      console.log("🔒 Redirecting admin to /overview");
      navigate("/overview");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Login successful", description: "Redirecting..." });

      await new Promise((resolve) => setTimeout(resolve, 500));
      await redirectBasedOnRole();
    } catch (err) {
      console.error("Login error:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg border shadow-sm">
        {/* Logo & Heading */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-xl font-bold text-secondary-foreground tracking-tight">J2</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome Back</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>

          <div className="text-center mt-4">
            <Link
              to="/forgot-password"
              className="text-sm text-muted-foreground hover:text-secondary transition-colors duration-200"
            >
              Forgot your password?
            </Link>
          </div>
        </form>

        <p className="text-center text-xs text-muted-foreground pt-2">
          © 2026 J2 Group • Melbourne, Australia
        </p>
      </div>
    </div>
  );
};

export default Login;
