import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction 
}: EmptyStateProps) => {
  return (
    <div 
      className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in"
      role="status"
      aria-label={title}
    >
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted/20 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button 
          onClick={onAction} 
          variant="secondary"
          className="transition-transform hover:scale-105 active:scale-95"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
