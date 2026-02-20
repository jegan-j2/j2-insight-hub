import { Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  const [clientData, setClientData] = useState<{ logo_url: string | null; banner_url: string | null; campaign_start: string | null; campaign_end: string | null; target_sqls: number | null } | null>(null);

  useEffect(() => {
    const fetchClient = async () => {
      const { data } = await supabase
        .from("clients")
        .select("logo_url, banner_url, campaign_start, campaign_end, target_sqls")
        .eq("client_id", clientSlug)
        .maybeSingle();
      if (data) setClientData(data);
    };
    if (clientSlug) fetchClient();
  }, [clientSlug]);

  const bannerStyle = clientData?.banner_url
    ? {
        backgroundImage: `url(${clientData.banner_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { background: gradient };

  return (
    <div 
      className="relative w-full h-[200px] md:h-[160px] sm:h-[120px] rounded-t-lg overflow-hidden animate-fade-in"
      style={bannerStyle}
    >
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      
      {/* Edit Button */}
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
      
      {/* Client Logo + Info */}
      <div className="absolute bottom-4 left-4 sm:bottom-3 sm:left-3 md:bottom-4 md:left-4 lg:bottom-6 lg:left-8 flex items-end gap-4">
        {/* Client Logo */}
        {clientData?.logo_url ? (
          <img 
            src={clientData.logo_url} 
            alt={clientName}
            className="w-16 h-16 sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full border-4 border-white/90 object-cover shadow-lg bg-white"
          />
        ) : (
          <div className="w-16 h-16 sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full border-4 border-white/90 bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <span className="text-xl sm:text-lg md:text-xl lg:text-2xl font-bold text-white">
              {clientName.substring(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        
        <div className="space-y-1">
          <h1 
            className="text-3xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white drop-shadow-lg"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
          >
            {clientName}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {clientData?.campaign_start && clientData?.campaign_end && (
              <p className="text-sm sm:text-xs md:text-sm text-white/90 drop-shadow-md"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                Campaign: {format(new Date(clientData.campaign_start), "MMM d")} - {format(new Date(clientData.campaign_end), "MMM d, yyyy")}
              </p>
            )}
            {clientData?.target_sqls && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
                Target: {clientData.target_sqls} SQLs
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
