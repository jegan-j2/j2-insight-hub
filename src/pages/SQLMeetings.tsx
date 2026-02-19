import { SQLBookedMeetingsTable } from "@/components/SQLBookedMeetingsTable";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { cn } from "@/lib/utils";

const SQLMeetings = () => {
  const { dateRange } = useDateFilter();
  const [isLoading, setIsLoading] = useState(false);
  const { refreshKey, manualRefresh } = useAutoRefresh(300000);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    document.title = "J2 Dashboard - SQL Meetings";
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [dateRange, refreshKey]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">SQL Meetings</h1>
          <p className="text-muted-foreground mt-2">
            Track and manage all SQL booked meetings across clients
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setIsRefreshing(true);
                  manualRefresh();
                  setTimeout(() => setIsRefreshing(false), 1000);
                }}
                aria-label="Refresh data"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin text-cyan-500")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh data (auto-refreshes every 5 mins)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <SQLBookedMeetingsTable dateRange={dateRange} isLoading={isLoading} />
    </div>
  );
};

export default SQLMeetings;
