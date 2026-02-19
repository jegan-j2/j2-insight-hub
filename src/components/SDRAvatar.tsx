import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "bg-cyan-600", "bg-blue-600", "bg-purple-600", "bg-green-600", "bg-orange-600",
  "bg-teal-600", "bg-indigo-600", "bg-rose-600",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || "?").toUpperCase();
}

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
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

export const SDRAvatar = ({ name, photoUrl, size = "md", className }: SDRAvatarProps) => {
  const initials = getInitials(name);
  const color = getColorForName(name);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {photoUrl && <AvatarImage src={photoUrl} alt={name} />}
      <AvatarFallback className={cn(color, "text-white font-bold")}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};
