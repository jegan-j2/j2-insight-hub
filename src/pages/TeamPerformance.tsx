import { format, subDays, startOfMonth, endOfMonth, subMonths, isSameDay, eachDayOfInterval, isWeekend } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertCircle, RefreshCw, Users, Download, Loader2, ChevronDown, FileText, Table2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDateFilter, type FilterType } from "@/contexts/DateFilterContext";
import { SDRActivityChart } from "@/components/SDRActivityChart";
import { SDRLeaderboardTable } from "@/components/SDRLeaderboardTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { J2Loader } from "@/components/J2Loader";
import { useTeamPerformanceData } from "@/hooks/useTeamPerformanceData";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { toCSV, downloadCSV } from "@/lib/csvExport";
import { exportToPDF } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";


interface ClientOption {
  client_id: string;
  client_name: string;
}

const TeamPerformance = () => {
  const { dateRange, setDateRange, filterType, setFilterType, clientFilter, setClientFilter } = useDateFilter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  
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

  // Compute most improved
  const mostImproved = useMemo(() => {
    if (!previousLeaderboard || previousLeaderboard.length === 0) return null;
    const prevMap = new Map<string, number>();
    for (const entry of previousLeaderboard) {
      const key = `${entry.name}|||${entry.clientId}`;
      prevMap.set(key, parseFloat(entry.answerRate));
    }
    let best: { name: string; clientId: string; improvement: number } | null = null;
    for (const entry of leaderboard) {
      const key = `${entry.name}|||${entry.clientId}`;
      const prevRate = prevMap.get(key);
      if (prevRate !== undefined && prevRate > 0) {
        const improvement = parseFloat(entry.answerRate) - prevRate;
        if (improvement > 0 && (!best || improvement > best.improvement)) {
          best = { name: entry.name, clientId: entry.clientId || "", improvement };
        }
      }
    }
    return best;
  }, [leaderboard, previousLeaderboard]);

  const clientNameMap = useMemo(() =>
    Object.fromEntries(clients.map(c => [c.client_id, c.client_name])),
    [clients]
  );

  // Melbourne timezone greeting
  const [firstName, setFirstName] = useState<string | null>(null);
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name;
      if (fullName && typeof fullName === "string") {
        const raw = fullName.split(/[\s\-]/)[0];
        setFirstName(raw.charAt(0).toUpperCase() + raw.slice(1));
      } else if (user.email) {
        const local = user.email.split("@")[0];
        setFirstName(local.charAt(0).toUpperCase() + local.slice(1));
      }
    };
    getUser();
  }, []);

  const melbourneGreeting = useMemo(() => {
    const now = new Date();
    const melb = toZonedTime(now, "Australia/Melbourne");
    const hour = melb.getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    if (hour >= 17 && hour < 21) return "Good evening";
    return "Welcome back";
  }, []);

  // Team totals
  const teamTotals = useMemo(() => {
    let dials = 0, answered = 0, dms = 0, sqls = 0;
    for (const sdr of leaderboard) {
      dials += Number(sdr.totalDials) || 0;
      answered += Number(sdr.totalAnswered) || 0;
      dms += Number(sdr.totalDMs) || 0;
      sqls += Number(sdr.totalSQLs) || 0;
    }
    const answerRate = dials > 0 ? ((answered / dials) * 100).toFixed(1) : "0.0";
    const convRate = dials > 0 ? ((sqls / dials) * 100).toFixed(1) : "0.0";
    return { dials, answered, answerRate, dms, sqls, convRate };
  }, [leaderboard]);

  // Team pace indicator — only for "This Month"
  const [targetSQLs, setTargetSQLs] = useState<number | null>(null);
  useEffect(() => {
    if (filterType !== "thisMonth") { setTargetSQLs(null); return; }
    const fetchTargets = async () => {
      const cid = clientFilter && clientFilter !== "all" ? clientFilter : null;
      if (cid) {
        const { data } = await supabase.from("clients").select("target_sqls").eq("client_id", cid).maybeSingle();
        setTargetSQLs(data?.target_sqls ?? null);
      } else {
        const { data } = await supabase.from("clients").select("target_sqls").eq("status", "active");
        if (data) {
          const total = data.reduce((s, c) => s + (c.target_sqls || 0), 0);
          setTargetSQLs(total > 0 ? total : null);
        }
      }
    };
    fetchTargets();
  }, [filterType, clientFilter]);

  const paceData = useMemo(() => {
    if (filterType !== "thisMonth") return null;
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const today = now > monthEnd ? monthEnd : now;
    
    const allWorkingDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(d => !isWeekend(d));
    const elapsedWorkingDays = eachDayOfInterval({ start: monthStart, end: today }).filter(d => !isWeekend(d)).length;
    const totalWorkingDays = allWorkingDays.length;
    
    const totalSQLs = teamTotals.sqls;
    const runRate = elapsedWorkingDays > 0 ? totalSQLs / elapsedWorkingDays : 0;
    const projected = Math.round(runRate * totalWorkingDays);
    
    return { totalSQLs, elapsedWorkingDays, totalWorkingDays, runRate, projected };
  }, [filterType, teamTotals.sqls]);

  // Only show full-page loader on first load (no cached data yet)
  if (loading && leaderboard.length === 0) return <J2Loader />;

  return (
    <div id="team-performance-content" className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-[15px] text-[#0f172a] dark:text-slate-300 mb-1">{melbourneGreeting}{firstName ? `, ${firstName}!` : "!"}</p>
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

      {/* Date Filter Buttons */}
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
                    ? "bg-[#0f172a] hover:bg-[#0f172a] text-white font-semibold shadow-sm dark:bg-white dark:hover:bg-white dark:text-[#0f172a]"
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
                    ? "bg-[#0f172a] hover:bg-[#0f172a] text-white font-semibold shadow-sm dark:bg-white dark:hover:bg-white dark:text-[#0f172a]"
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

          {/* Client Filter — on same row, right side, matching date tab styling */}
          <div className="ml-auto">
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className={cn(
                "w-[180px] min-h-[44px] text-xs sm:text-sm rounded-md transition-all duration-200",
                "bg-[#0f172a] text-white border-[#0f172a] hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:border-white dark:hover:bg-gray-100 font-semibold"
              )}>
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
        {dateRange?.from && dateRange?.to && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>Filtered period: {format(dateRange.from, "MMM dd, yyyy")} – {format(dateRange.to, "MMM dd, yyyy")}</span>
          </div>
        )}
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

      {/* Leaderboard — no podium, top 3 highlighted in table */}
      {leaderboard.length > 0 ? (
        <>
          <SDRLeaderboardTable
            leaderboardData={leaderboard}
            clientNameMap={clientNameMap}
            showClientColumn={clientFilter === "all"}
            mostImproved={mostImproved}
          />
        </>
      ) : null}

      {/* Team Totals Bar — between table and chart */}
      {leaderboard.length > 0 && (
        <div className="bg-[#F8FAFC] dark:bg-slate-800 border-t border-[#E2E8F0] dark:border-slate-700 rounded-t-lg px-6 py-4">
          <div className="flex flex-wrap items-center gap-4 sm:gap-0 sm:justify-between">
            <span className="text-[13px] font-bold text-[#0f172a] dark:text-white">Team Totals:</span>
            <div className="hidden sm:block w-px h-5 bg-[#E2E8F0] dark:bg-slate-600" />
            <div className="text-center">
              <span className="block text-[12px] text-muted-foreground">Total Dials</span>
              <span className="block text-[14px] font-bold text-[#0f172a] dark:text-white">{teamTotals.dials.toLocaleString()}</span>
            </div>
            <div className="hidden sm:block w-px h-5 bg-[#E2E8F0] dark:bg-slate-600" />
            <div className="text-center">
              <span className="block text-[12px] text-muted-foreground">Answered</span>
              <span className="block text-[14px] font-bold text-[#0f172a] dark:text-white">{teamTotals.answered.toLocaleString()}</span>
            </div>
            <div className="hidden sm:block w-px h-5 bg-[#E2E8F0] dark:bg-slate-600" />
            <div className="text-center">
              <span className="block text-[12px] text-muted-foreground">Avg Answer Rate</span>
              <span className="block text-[14px] font-bold text-[#0f172a] dark:text-white">{teamTotals.answerRate}%</span>
            </div>
            <div className="hidden sm:block w-px h-5 bg-[#E2E8F0] dark:bg-slate-600" />
            <div className="text-center">
              <span className="block text-[12px] text-muted-foreground">DM Conv.</span>
              <span className="block text-[14px] font-bold text-[#0f172a] dark:text-white">{teamTotals.dms.toLocaleString()}</span>
            </div>
            <div className="hidden sm:block w-px h-5 bg-[#E2E8F0] dark:bg-slate-600" />
            <div className="text-center">
              <span className="block text-[12px] text-muted-foreground">SQLs</span>
              <span className="block text-[14px] font-bold text-[#0f172a] dark:text-white">{teamTotals.sqls.toLocaleString()}</span>
            </div>
            <div className="hidden sm:block w-px h-5 bg-[#E2E8F0] dark:bg-slate-600" />
            <div className="text-center">
              <span className="block text-[12px] text-muted-foreground">Team Conv. Rate</span>
              <span className="block text-[14px] font-bold text-[#0f172a] dark:text-white">{teamTotals.convRate}%</span>
            </div>
          </div>
        </div>
      )}

      {/* SDR Activity Breakdown Chart */}
      {activityChartData.length > 0 ? (
        <SDRActivityChart chartData={activityChartData} />
      ) : null}
    </div>
  );
};

export default TeamPerformance;
