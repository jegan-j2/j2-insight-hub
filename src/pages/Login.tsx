import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2 } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Mock authentication - simulate API call
    setTimeout(() => {
      if (email && password) {
        toast({
          title: "Login successful",
          description: "Redirecting to dashboard...",
        });
        setTimeout(() => {
          navigate("/dashboard");
        }, 500);
      } else {
        toast({
          title: "Login failed",
          description: "Please enter both email and password.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/10 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-secondary/20 via-transparent to-transparent pointer-events-none" />
      
      <div className="w-full max-w-md relative">
        <div className="bg-card/50 backdrop-blur-xl border border-border rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] p-8 space-y-6 animate-fade-in">
          {/* Logo */}
          <div className="flex flex-col items-center space-y-2">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center shadow-lg">
              <Building2 className="w-10 h-10 text-primary" />
            </div>
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
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold transition-all duration-300 hover:shadow-[0_0_20px_rgba(194,255,0,0.3)] hover:scale-[1.02]"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            <p>Demo credentials: any email and password</p>
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
