import { Check, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useMemo } from "react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

const requirements = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  { label: "One special character", test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
];

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const results = requirements.map((r) => ({ ...r, met: r.test(password) }));
  const metCount = results.filter((r) => r.met).length;

  const { strength, color, label } = useMemo(() => {
    const pct = (metCount / requirements.length) * 100;
    if (metCount <= 1) return { strength: pct, color: "bg-red-500", label: "Weak" };
    if (metCount <= 2) return { strength: pct, color: "bg-orange-500", label: "Fair" };
    if (metCount <= 3) return { strength: pct, color: "bg-yellow-500", label: "Good" };
    return { strength: pct, color: "bg-green-500", label: "Strong" };
  }, [metCount]);

  const allMet = metCount === requirements.length;

  if (!password) return null;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={`font-medium ${metCount <= 1 ? "text-red-500" : metCount <= 2 ? "text-orange-500" : metCount <= 3 ? "text-yellow-500" : "text-green-500"}`}>
            {label}
          </span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-300 ${color}`}
            style={{ width: `${strength}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <ul className="space-y-1.5">
        {results.map((r) => (
          <li key={r.label} className="flex items-center gap-2 text-xs">
            {r.met ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <X className="h-3.5 w-3.5 text-red-400" />
            )}
            <span className={r.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
              {r.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const isPasswordStrong = (password: string) =>
  requirements.every((r) => r.test(password));
