import { Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

interface ClientBannerProps {
  clientSlug: string;
  clientName: string;
  dateRange?: DateRange;
}

const clientGradients: Record<string, string> = {
  "inxpress": "linear-gradient(135deg, #0891B2 0%, #06B6D4 100%)",
  "congero": "linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)",
  "techcorp-solutions": "linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)",
  "global-logistics": "linear-gradient(135deg, #059669 0%, #10B981 100%)",
  "finserve-group": "linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)",
  "healthcare-plus": "linear-gradient(135deg, #0284C7 0%, #06B6D4 100%)",
};

export const ClientBanner = ({ clientSlug, clientName, dateRange }: ClientBannerProps) => {
  const gradient = clientGradients[clientSlug] || clientGradients["inxpress"];
  
  return (
    <div 
      className="relative w-full h-[200px] md:h-[160px] sm:h-[120px] rounded-t-lg overflow-hidden animate-fade-in"
      style={{ 
        background: gradient,
      }}
    >
      {/* Gradient Overlay - Dark to Transparent from Bottom to Top */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      
      {/* Edit Button - Top Right (for future admin use) */}
      <div className="absolute top-4 right-4 opacity-0 hover:opacity-100 transition-opacity duration-200">
        <Button
          variant="secondary"
          size="sm"
          className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
        >
          <Edit2 className="h-3 w-3 mr-2" />
          Edit Banner
        </Button>
      </div>
      
      {/* Client Information - Bottom Left */}
      <div className="absolute bottom-4 left-4 sm:bottom-3 sm:left-3 md:bottom-4 md:left-4 lg:bottom-6 lg:left-8 space-y-1">
        <h1 
          className="text-3xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white drop-shadow-lg"
          style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
        >
          {clientName}
        </h1>
        {dateRange?.from && dateRange?.to && (
          <p 
            className="text-sm sm:text-xs md:text-sm text-white/90 drop-shadow-md"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
          >
            {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
          </p>
        )}
      </div>
    </div>
  );
};
