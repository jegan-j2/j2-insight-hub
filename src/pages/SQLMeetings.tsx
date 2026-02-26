import { SQLBookedMeetingsTable } from "@/components/SQLBookedMeetingsTable";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { cn } from "@/lib/utils";
import { exportToPDF } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const SQLMeetings = () => {
  const { dateRange } = useDateFilter();
  const [isLoading, setIsLoading] = useState(false);
  const { refreshKey, manualRefresh } = useAutoRefresh(300000);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const { toast } = useToast();

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const dateStr = format(new Date(), "yyyy-MM-dd");
      await exportToPDF('sql-meetings-content', `j2-sql-meetings-${dateStr}.pdf`, 'SQL Meetings Report');
      toast({ title: "PDF downloaded successfully", className: "border-green-500" });
    } catch (err) {
      toast({ title: "PDF export failed", description: String(err), variant: "destructive" });
    } finally {
      setExportingPDF(false);
    }
  };
  useEffect(() => {
    document.title = "J2 Insights Dashboard - SQL Meetings";
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
        <Button
          variant="outline"
          onClick={handleExportPDF}
          disabled={isLoading || exportingPDF}
          className="gap-2 shrink-0"
        >
          {exportingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export PDF
        </Button>
      </div>
      
      <div id="sql-meetings-content">
        <SQLBookedMeetingsTable dateRange={dateRange} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default SQLMeetings;
