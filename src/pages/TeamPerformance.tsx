import { format, subDays, startOfMonth, endOfMonth, subMonths, isSameDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertCircle, RefreshCw, Users, Download, Loader2, ChevronDown, FileText, Table2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDateFilter, type FilterType } from "@/contexts/DateFilterContext";
import { SDRActivityChart } from "@/components/SDRActivityChart";
import { SDRLeaderboardTable } from "@/components/SDRLeaderboardTable";
import { SDRPodium } from "@/components/SDRPodium";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { J2Loader } from "@/components/J2Loader";
import { useTeamPerformanceData } from "@/hooks/useTeamPerformanceData";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toCSV, downloadCSV } from "@/lib/csvExport";
import { exportToPDF } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 11) return "Good morning";
  if (hour >= 12 && hour <= 16) return "Good afternoon";
  if (hour >= 17 && hour <= 20) return "Good evening";
  return "Welcome back";
};

interface ClientOption {
  client_id: string;
  client_name: string;
}

const TeamPerformance = () => {
  const { dateRange, setDateRange, filterType, setFilterType, clientFilter, setClientFilter } = useDateFilter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);
  const { toast } = useToast();
  const { loading, error, leaderboard, previousLeaderboard, activityChartData, refetch } = useTeamPerformanceData(dateRange, clientFilter);
  const { refreshKey, manualRefresh } = useAutoRefresh(300000);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);

  useEffect(() => {
    if (refreshKey > 0) {
      setIsRefreshing(true);
      refetch();
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }, [refreshKey, refetch]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const fullName = user.user_metadata?.full_name;
      if (fullName && typeof fullName === "string") {
        setFirstName(fullName.split(" ")[0]);
      } else if (user.email) {
        const local = user.email.split("@")[0];
        setFirstName(local.charAt(0).toUpperCase() + local.slice(1));
      }
    };
    getUser();
  }, []);

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
      toast({ title: "CSV exported successfully", className: "border-[#10b981]" });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const dateStr = format(new Date(), "yyyy-MM-dd");
      await exportToPDF('team-performance-content', `j2-team-performance-${dateStr}.pdf`, 'Team Performance Report');
      toast({ title: "PDF exported successfully", className: "border-[#10b981]" });
    } catch (err) {
      toast({ title: "Export failed", description: String(err), variant: "destructive" });
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

  if (loading) return <J2Loader />;

  return (
    <div id="team-performance-content" className="space-y-6 animate-fade-in">
      {/* Header — matches Campaign Overview */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Sales Development Team Performance</h1>
          <p className="text-muted-foreground">Monitor individual SDR performance across all clients</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={loading || leaderboard.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100 font-medium text-sm transition-colors disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4 ml-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileText className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                <Table2 className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Date Filter Buttons — matches Campaign Overview layout */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {([
            { label: "Last 7 Days", type: "last7days" as FilterType, range: { from: subDays(new Date(), 7), to: new Date() } },
            { label: "Last 30 Days", type: "last30days" as FilterType, range: { from: subDays(new Date(), 30), to: new Date() } },
            { label: "This Month", type: "thisMonth" as FilterType, range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
            { label: "Last Month", type: "lastMonth" as FilterType, range: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) } },
          ]).map((filter) => {
            const isActive = filterType === filter.type && dateRange?.from && dateRange?.to && isSameDay(dateRange.from, filter.range.from) && isSameDay(dateRange.to, filter.range.to);
            return (
              <Button
                key={filter.type}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => { setDateRange(filter.range); setFilterType(filter.type); setCustomRange(undefined); }}
                className={cn(
                  "transition-all duration-200 min-h-[44px] active:scale-95 text-xs sm:text-sm",
                  isActive
                    ? "bg-[#0f172a] hover:bg-[#0f172a] text-white font-semibold shadow-md dark:bg-white dark:hover:bg-white dark:text-[#0f172a]"
                    : "bg-transparent text-muted-foreground border border-border hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {filter.label}
              </Button>
            );
          })}
          <Popover open={customPopoverOpen} onOpenChange={setCustomPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={filterType === "custom" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "transition-all duration-200 min-h-[44px] active:scale-95 text-xs sm:text-sm",
                  filterType === "custom"
                    ? "bg-[#0f172a] hover:bg-[#0f172a] text-white font-semibold shadow-md dark:bg-white dark:hover:bg-white dark:text-[#0f172a]"
                    : "bg-transparent text-muted-foreground border border-border hover:bg-muted/50 hover:text-foreground"
                )}
              >
                Custom <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-border z-[100]" align="start" sideOffset={8}>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={new Date()}
                selected={customRange}
                onSelect={(range) => {
                  setCustomRange(range);
                  if (range?.from && range?.to) {
                    setDateRange(range);
                    setFilterType("custom");
                    setCustomPopoverOpen(false);
                  }
                }}
                numberOfMonths={2}
                className="pointer-events-auto p-3"
              />
            </PopoverContent>
          </Popover>

          {/* Client Filter — on same row, right side */}
          <div className="ml-auto">
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[180px] min-h-[44px] text-xs sm:text-sm">
                <SelectValue placeholder="All Clients" />
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
        {/* Read-only filtered period display */}
        {dateRange?.from && dateRange?.to && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>Filtered period: {format(dateRange.from, "MMM dd, yyyy")} – {format(dateRange.to, "MMM dd, yyyy")}</span>
          </div>
        )}
      </div>

      {/* Client filter moved inline with date tabs above */}

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

      {/* Podium + Leaderboard */}
      {leaderboard.length > 0 ? (
        <>
          <SDRPodium
            leaderboardData={leaderboard}
            clientNameMap={Object.fromEntries(clients.map(c => [c.client_id, c.client_name]))}
            previousPeriodData={previousLeaderboard.length > 0 ? previousLeaderboard : undefined}
          />
          <SDRLeaderboardTable
            leaderboardData={leaderboard}
            clientNameMap={Object.fromEntries(clients.map(c => [c.client_id, c.client_name]))}
            showClientColumn={clientFilter === "all"}
          />
        </>
      ) : null}

      {/* SDR Activity Breakdown Chart - Full Width */}
      {activityChartData.length > 0 ? (
        <SDRActivityChart chartData={activityChartData} />
      ) : null}
    </div>
  );
};

export default TeamPerformance;
