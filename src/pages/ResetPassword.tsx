import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { PasswordStrengthIndicator, isPasswordStrong } from "@/components/PasswordStrengthIndicator";
import { useTheme } from "@/contexts/ThemeContext";

const LOGO_LIGHT = "https://eaeqkgjhgdykxwjkaxpj.supabase.co/storage/v1/object/public/branding/j2_logo_new_lightmode.png";
const LOGO_DARK = "https://eaeqkgjhgdykxwjkaxpj.supabase.co/storage/v1/object/public/branding/j2_logo_new_darkmode.png";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidToken(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidToken(true);
      } else {
        setTimeout(() => {
          setValidToken((prev) => (prev === null ? false : prev));
        }, 1500);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const canSubmit = isPasswordStrong(password) && password === confirmPassword && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordStrong(password)) {
      toast({ title: "Password too weak", description: "Please meet all password requirements.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords match.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Password updated", description: "Redirecting to login..." });
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (validToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#111827]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f172a] dark:text-[#2dd4bf]" />
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#111827]">
        <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-[#1a2235] rounded-lg border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] shadow-sm text-center">
          <div className="flex justify-center">
            <img src={resolvedTheme === "dark" ? LOGO_DARK : LOGO_LIGHT} alt="J2 Group" className="w-20 h-20 rounded-full object-contain" />
          </div>
          <Lock className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="text-2xl font-bold text-[#0f172a] dark:text-[#f1f5f9]">Invalid Reset Link</h1>
          <p className="text-[#64748b] dark:text-[rgba(255,255,255,0.35)]">This link has expired or is invalid.</p>
          <Link to="/forgot-password">
            <Button className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white dark:bg-[#2dd4bf] dark:hover:bg-[#14b8a6] dark:text-[#0d1420]">Request New Link</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#111827]">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-[#1a2235] rounded-lg border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] shadow-sm">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={resolvedTheme === "dark" ? LOGO_DARK : LOGO_LIGHT} alt="J2 Group" className="w-20 h-20 rounded-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-[#0f172a] dark:text-[#f1f5f9]">Set New Password</h1>
          <p className="text-[#64748b] dark:text-[rgba(255,255,255,0.35)]">Enter your new password below</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10 border-[#e2e8f0] dark:border-[rgba(255,255,255,0.1)] focus-visible:border-[#0f172a] dark:focus-visible:border-[#2dd4bf] focus-visible:ring-[#0f172a]/20 dark:focus-visible:ring-[#2dd4bf]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrengthIndicator password={password} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirm"
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="pr-10 border-[#e2e8f0] dark:border-[rgba(255,255,255,0.1)] focus-visible:border-[#0f172a] dark:focus-visible:border-[#2dd4bf] focus-visible:ring-[#0f172a]/20 dark:focus-visible:ring-[#2dd4bf]/20"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500">Passwords don't match</p>
            )}
          </div>
          <Button type="submit" className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white dark:bg-[#2dd4bf] dark:hover:bg-[#14b8a6] dark:text-[#0d1420]" disabled={!canSubmit}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>
        <p className="text-center text-xs text-[#94a3b8] dark:text-[rgba(255,255,255,0.2)] pt-2">
          © 2026 J2 Group • Melbourne, Australia
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
