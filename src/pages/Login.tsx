import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase, getUserMetadata } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import j2Logo from "@/assets/j2-logo.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "J2 Dashboard - Login";
    // Redirect if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/overview", { replace: true });
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      const metadata = await getUserMetadata();

      toast({
        title: "Login successful",
        description: `Welcome back!`,
        duration: 2000,
      });

      if (metadata?.role === "client" && metadata.clientId) {
        navigate(`/client/${metadata.clientId}`, { replace: true });
      } else {
        navigate("/overview", { replace: true });
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    toast({
      title: "Password reset",
      description: "Password reset will be available once admin creates accounts",
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/10 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-secondary/20 via-transparent to-transparent pointer-events-none" />
      
      <div className="w-full max-w-md relative">
        <div className="bg-card/50 backdrop-blur-xl border border-border rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] p-8 space-y-6 animate-fade-in">
          {/* Logo */}
          <div className="flex flex-col items-center space-y-2">
            <img 
              src={j2Logo} 
              alt="J2 Group" 
              className="w-24 h-24 rounded-full object-cover shadow-lg"
            />
            <h1 className="text-3xl font-bold text-foreground">J2 Group</h1>
            <p className="text-muted-foreground text-sm">Lead Generation Dashboard</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-secondary transition-all"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-secondary transition-all"
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold transition-all duration-300 hover:shadow-[0_0_20px_rgba(194,255,0,0.3)] hover:scale-[1.02]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-secondary hover:underline"
            >
              Forgot password?
            </button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      </div>
    </div>
  );
};

export default Login;
