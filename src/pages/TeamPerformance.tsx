import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarDaysIcon, AlertCircle, RefreshCw, Users, Download, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { SDRActivityChart } from "@/components/SDRActivityChart";
import { SDRLeaderboardTable } from "@/components/SDRLeaderboardTable";
import { SDRQuickStatsCards } from "@/components/SDRQuickStatsCards";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KPICardSkeleton, ChartSkeleton } from "@/components/LoadingSkeletons";
import { EmptyState } from "@/components/EmptyState";
import { useTeamPerformanceData } from "@/hooks/useTeamPerformanceData";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toCSV, downloadCSV } from "@/lib/csvExport";
import { exportToPDF } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { cn } from "@/lib/utils";

interface ClientOption {
  client_id: string;
  client_name: string;
}

const TeamPerformance = () => {
  const { dateRange, setDateRange, filterType, setFilterType } = useDateFilter();
  const [clientFilter, setClientFilter] = useState("all");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const { toast } = useToast();
  const { loading, error, leaderboard, activityChartData, refetch } = useTeamPerformanceData(dateRange, clientFilter);
  const { refreshKey, manualRefresh } = useAutoRefresh(300000);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (refreshKey > 0) {
      setIsRefreshing(true);
      refetch();
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }, [refreshKey, refetch]);

  const handleExportCSV = () => {
    setExporting(true);
    try {
      const dateStr = format(new Date(), "yyyy-MM-dd");
      const headers = ["Rank", "Name", "Dials", "Answered", "Answer Rate (%)", "DMs Reached", "SQLs", "Conversion Rate (%)"];
      const rows = leaderboard.map(sdr => [
        sdr.rank,
        sdr.name,
        sdr.totalDials,
        sdr.totalAnswered,
        sdr.answerRate,
        sdr.totalDMs,
        sdr.totalSQLs,
        sdr.conversionRate,
      ]);
      downloadCSV(toCSV(headers, rows), `j2-team-performance-${dateStr}.csv`);
      toast({ title: "CSV downloaded successfully", className: "border-green-500" });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const dateStr = format(new Date(), "yyyy-MM-dd");
      await exportToPDF('team-performance-content', `j2-team-performance-${dateStr}.pdf`, 'Team Performance Report');
      toast({ title: "PDF downloaded successfully", className: "border-green-500" });
    } catch (err) {
      toast({ title: "PDF export failed", description: String(err), variant: "destructive" });
    } finally {
      setExportingPDF(false);
    }
  };

  useEffect(() => {
    document.title = "J2 Insights Dashboard - Team Performance";
    const fetchClients = async () => {
      const { data } = await supabase
        .from("clients")
        .select("client_id, client_name")
        .eq("status", "active")
        .order("client_name");
      if (data) setClients(data);
    };
    fetchClients();
  }, []);

  return (
    <div id="team-performance-content" className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            <span className="hidden sm:inline">Sales Development Team Performance</span>
            <span className="sm:hidden">Team Performance</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">Monitor individual SDR performance across all clients</p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setIsRefreshing(true);
                    refetch();
                    manualRefresh();
                    setTimeout(() => setIsRefreshing(false), 1000);
                  }}
                  aria-label="Refresh data"
                >
                  <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin text-blue-500")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh data (auto-refreshes every 5 mins)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={loading || exporting || leaderboard.length === 0}
            className="gap-2 shrink-0"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={loading || exportingPDF || leaderboard.length === 0}
            className="gap-2 shrink-0"
          >
            {exportingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export PDF
          </Button>
        </div>
      </div>

      {/* Date Range Picker with Quick Filters */}
      <div className="space-y-3">
        <DateRangePicker 
          date={dateRange} 
          onDateChange={setDateRange}
          filterType={filterType}
          onFilterTypeChange={setFilterType}
          className="w-full"
        />
        
        {/* Selected Date Range Display and Client Filter */}
        <div className="flex flex-col gap-3">
          {dateRange?.from && dateRange?.to && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground bg-muted/20 border border-border rounded-lg px-3 sm:px-4 py-2 transition-all duration-200">
              <CalendarDaysIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">
                <span className="hidden sm:inline">Performance data for: {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}</span>
                <span className="sm:hidden">{format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}</span>
              </span>
            </div>
          )}
          
          {/* Client Filter */}
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-full sm:w-[200px] min-h-[44px]">
              <SelectValue placeholder="Filter by client" />
            </SelectTrigger>
            <SelectContent className="z-[100] bg-card">
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.client_id} value={c.client_id}>{c.client_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm flex-1">{error}</span>
          <Button variant="outline" size="sm" onClick={refetch} className="gap-2 shrink-0">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && leaderboard.length === 0 && (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Add team members in Settings to start tracking performance metrics."
          actionLabel="Go to Settings"
          onAction={() => window.location.href = "/settings"}
        />
      )}

      {/* Top Section: Leaderboard + Quick Stats */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartSkeleton />
          </div>
          <div className="lg:col-span-1">
            <KPICardSkeleton />
          </div>
        </div>
      ) : leaderboard.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SDRLeaderboardTable leaderboardData={leaderboard} />
          </div>
          <div className="lg:col-span-1">
            <SDRQuickStatsCards leaderboardData={leaderboard} />
          </div>
        </div>
      ) : null}

      {/* SDR Activity Breakdown Chart - Full Width */}
      {loading ? (
        <ChartSkeleton />
      ) : activityChartData.length > 0 ? (
        <SDRActivityChart chartData={activityChartData} />
      ) : null}
    </div>
  );
};

export default TeamPerformance;
