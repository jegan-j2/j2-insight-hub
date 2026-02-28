import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

const LOGO_LIGHT = "https://eaeqkgjhgdykxwjkaxpj.supabase.co/storage/v1/object/public/branding/j2_logo_new_lightmode.png";
const LOGO_DARK = "https://eaeqkgjhgdykxwjkaxpj.supabase.co/storage/v1/object/public/branding/j2_logo_new_darkmode.png";

const ForgotPassword = () => {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const savedTheme = localStorage.getItem('j2-theme-preference');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        if (import.meta.env.DEV) console.log('Password reset email sent to:', email);
        if (import.meta.env.DEV) console.log('Redirect URL:', `${window.location.origin}/reset-password`);
        setSent(true);
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setSent(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg border shadow-sm">
        {sent ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <img src={resolvedTheme === "dark" ? LOGO_DARK : LOGO_LIGHT} alt="J2 Group" className="w-20 h-20 rounded-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Check Your Email</h1>
            <CheckCircle2 className="mx-auto h-12 w-12 text-[#10b981]" />
            <p className="text-muted-foreground">
              We've sent reset instructions to <span className="font-medium text-foreground">{email}</span>
            </p>
            <div className="flex flex-col gap-3 pt-2">
              <Button onClick={handleResend} className="w-full bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100">
                Resend Email
              </Button>
              <Link
                to="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 inline-flex items-center gap-1 justify-center"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <img src={resolvedTheme === "dark" ? LOGO_DARK : LOGO_LIGHT} alt="J2 Group" className="w-20 h-20 rounded-full object-contain" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Forgot Password?</h1>
              <p className="text-muted-foreground">Enter your email and we'll send you reset instructions</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <Button
                type="submit"
                className={cn(
                  "w-full transition-colors",
                    !email.trim() || loading
                     ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                     : "bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-200"
                )}
                disabled={loading || !email.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
