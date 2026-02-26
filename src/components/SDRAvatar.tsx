import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const AVATAR_COLOR_MAP: Record<number, string> = {
  0:  "#0891b2",
  1:  "#2563eb",
  2:  "#9333ea",
  3:  "#16a34a",
  4:  "#ea580c",
  5:  "#0d9488",
  6:  "#4f46e5",
  7:  "#e11d48",
  8:  "#7c3aed",
  9:  "#059669",
  10: "#d97706",
  11: "#db2777",
  12: "#0284c7",
  13: "#65a30d",
  14: "#c026d3",
  15: "#dc2626",
  16: "#0e7490",
  17: "#1d4ed8",
  18: "#7e22ce",
  19: "#047857",
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
