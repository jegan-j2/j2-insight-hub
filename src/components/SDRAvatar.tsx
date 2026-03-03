import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const AVATAR_COLOR_MAP: Record<number, string> = {
  0:  "#e11d48",
  1:  "#0891b2",
  2:  "#16a34a",
  3:  "#9333ea",
  4:  "#ea580c",
  5:  "#1d4ed8",
  6:  "#db2777",
  7:  "#059669",
  8:  "#d97706",
  9:  "#4f46e5",
  10: "#dc2626",
  11: "#0d9488",
  12: "#7c3aed",
  13: "#65a30d",
  14: "#c026d3",
  15: "#0284c7",
  16: "#b45309",
  17: "#be185d",
  18: "#047857",
  19: "#6d28d9",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || "?").toUpperCase();
}

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLOR_MAP[
    Math.abs(hash) % Object.keys(AVATAR_COLOR_MAP).length
  ];
}

interface SDRAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-14 w-14 text-lg",
};

export const SDRAvatar = ({
  name, photoUrl, size = "md", className
}: SDRAvatarProps) => {
  const initials = getInitials(name);
  const bgColor = getColorForName(name);
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {photoUrl && <AvatarImage src={photoUrl} alt={name} />}
      <AvatarFallback
        className="text-white font-bold"
        style={{ backgroundColor: bgColor }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};
