import { format, subDays, startOfMonth, endOfMonth, subMonths, isSameDay, eachDayOfInterval, isWeekend } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertCircle, RefreshCw, Users, Download, Loader2, ChevronDown, FileText, Table2, CalendarX } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDateFilter, type FilterType } from "@/contexts/DateFilterContext";
import { SDRActivityChart } from "@/components/SDRActivityChart";
import { SDRLeaderboardTable } from "@/components/SDRLeaderboardTable";
import { TeamHeatmap } from "@/components/TeamHeatmap";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { J2Loader } from "@/components/J2Loader";
import { useTeamPerformanceData } from "@/hooks/useTeamPerformanceData";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toCSV, downloadCSV } from "@/lib/csvExport";
import * as XLSX from "xlsx-js-style";
import { useToast } from "@/hooks/use-toast";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserProfile } from "@/hooks/useUserProfile";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";


interface ClientOption {
  client_id: string;
  client_name: string;
  logo_url: string | null;
  campaign_start: string | null;
  campaign_end: string | null;
  target_sqls: number | null;
}

interface ClientLookup {
  client_id: string;
  client_name: string;
  logo_url: string | null;
}

const TeamPerformance = () => {
  const { dateRange, setDateRange, filterType, setFilterType, clientFilter, setClientFilter } = useDateFilter();
  const { isSdr } = useUserRole();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [allClients, setAllClients] = useState<ClientLookup[]>([]);
  const [hasTeamMembers, setHasTeamMembers] = useState<boolean | null>(null);
  const [exporting, setExporting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialView = searchParams.get("tab") === "heatmap" ? "heatmap" : "leaderboard";
  const [view, setView] = useState<"leaderboard" | "heatmap">(initialView);

  const handleViewChange = (next: "leaderboard" | "heatmap") => {
    setView(next);
    const params = new URLSearchParams(searchParams);
    if (next === "heatmap") {
      params.set("tab", "heatmap");
    } else {
      params.delete("tab");
    }
    setSearchParams(params, { replace: true });
  };
  const [exportingExcel, setExportingExcel] = useState(false);
  
  const { toast } = useToast();
  // SDR role always sees the full leaderboard across all clients (cannot be filtered)
  const effectiveClientFilter = isSdr ? "all" : clientFilter;
  const { loading, error, leaderboard, previousLeaderboard, activityChartData, refetch } = useTeamPerformanceData(dateRange, effectiveClientFilter);
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
    const headers = ["Rank", "SDR Name", "Client", "Total Dials", "Answered", "Answer Rate (%)", "DM Conversations", "SQLs", "Conversion Rate (%)", "Avg Talk Time (s)"];
      const rows = leaderboard.filter(sdr => sdr.totalDials > 0).map(sdr => [
        sdr.rank,
        sdr.name,
        clientNameMap[sdr.clientId] || sdr.clientId || "",
        sdr.totalDials,
        sdr.totalAnswered,
        sdr.answerRate,
        sdr.totalDMs,
        sdr.totalSQLs,
        sdr.conversionRate,
        sdr.avgDuration,
      ]);
      downloadCSV(toCSV(headers, rows), `j2-team-performance-${dateStr}.csv`);
      toast({ title: "CSV exported successfully", className: "border-[#10b981]" });
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = () => {
    setExportingExcel(true);
    try {
      const dateStr = format(new Date(), "yyyy-MM-dd");
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" }, name: "Arial", sz: 11 },
        fill: { fgColor: { rgb: "0F172A" } }
      };
      const evenRow = { fill: { fgColor: { rgb: "F1F5F9" } } };
      const oddRow = { fill: { fgColor: { rgb: "FFFFFF" } } };

      // Sheet 1 — KPI Summary
      const kpiData = [
        ["Metric", "Value"],
        ["Total Dials", teamTotals.dials],
        ["Answered", teamTotals.answered],
        ["Avg Answer Rate", teamTotals.answerRate + "%"],
        ["DM Conversations", teamTotals.dms],
        ["Total SQLs", teamTotals.sqls],
        ["Team Conv Rate", teamTotals.convRate + "%"],
        ["Date Range", dateRange?.from && dateRange?.to ? `${format(dateRange.from, "yyyy-MM-dd")} to ${format(dateRange.to, "yyyy-MM-dd")}` : ""],
      ];
      const kpiSheet = XLSX.utils.aoa_to_sheet(kpiData);
      kpiSheet["!cols"] = [{ wch: 24 }, { wch: 30 }];
      kpiData.forEach((_, i) => {
        const rowStyle = i === 0 ? headerStyle : (i % 2 === 0 ? evenRow : oddRow);
        const cell1 = XLSX.utils.encode_cell({ r: i, c: 0 });
        const cell2 = XLSX.utils.encode_cell({ r: i, c: 1 });
        if (kpiSheet[cell1]) kpiSheet[cell1].s = rowStyle;
        if (kpiSheet[cell2]) kpiSheet[cell2].s = rowStyle;
      });

      // Sheet 2 — SDR Leaderboard
      const sdrHeaders = ["Rank", "SDR Name", "Client", "Total Dials", "Answered", "Answer Rate", "DM Conversations", "SQLs", "Conversion Rate", "Avg Talk Time (s)"];
      const sdrData = [
        sdrHeaders,
        ...leaderboard.filter(sdr => sdr.totalDials > 0).map(sdr => [
          sdr.rank,
          sdr.name,
          clientNameMap[sdr.clientId] || sdr.clientId || "",
          sdr.totalDials,
          sdr.totalAnswered,
          sdr.answerRate + "%",
          sdr.totalDMs,
          sdr.totalSQLs,
          sdr.conversionRate + "%",
          sdr.avgDuration,
        ])
      ];
      const sdrSheet = XLSX.utils.aoa_to_sheet(sdrData);
      sdrSheet["!cols"] = [{ wch: 8 }, { wch: 22 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 18 }];
      sdrData.forEach((_, i) => {
        const rowStyle = i === 0 ? headerStyle : (i % 2 === 0 ? evenRow : oddRow);
        sdrHeaders.forEach((__, c) => {
          const cell = XLSX.utils.encode_cell({ r: i, c });
          if (sdrSheet[cell]) sdrSheet[cell].s = rowStyle;
        });
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, kpiSheet, "KPI Summary");
      XLSX.utils.book_append_sheet(wb, sdrSheet, "SDR Leaderboard");
      XLSX.writeFile(wb, `j2-team-performance-${dateStr}.xlsx`);
      toast({ title: "Excel exported successfully", className: "border-[#10b981]" });
    } catch (err) {
      toast({ title: "Export failed", description: String(err), variant: "destructive" });
    } finally {
      setExportingExcel(false);
    }
  };

  useEffect(() => {
    document.title = "J2 Insights Dashboard - Team Performance";
    const fetchClients = async () => {
      // Active clients for dropdown
      const { data } = await supabase
        .from("clients")
        .select("client_id, client_name, logo_url, campaign_start, campaign_end, target_sqls")
        .eq("status", "active")
        .order("client_name");
      if (data) setClients(data);
      // ALL clients (incl. inactive) for logo/name lookups
      const { data: all } = await supabase
        .from("clients")
        .select("client_id, client_name, logo_url")
        .order("client_name");
      if (all) setAllClients(all);
    };
    fetchClients();
  }, []);

  const clientNameMap = useMemo(() =>
    Object.fromEntries(allClients.map(c => [c.client_id, c.client_name])),
    [allClients]
  );

  const clientLogoMap = useMemo(() =>
    Object.fromEntries(allClients.map(c => [c.client_id, c.logo_url || ""])),
    [allClients]
  );

  const selectedClient = useMemo(() => {
    if (!clientFilter || clientFilter === "all") return null;
    return clients.find(c => c.client_id === clientFilter) || null;
  }, [clientFilter, clients]);

  // Melbourne timezone greeting
  const { firstName } = useUserProfile();


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

  // Weekly pace data — fetched from get_weekly_pace RPC, refreshed on client filter change
  interface WeeklyPace {
    sqls_this_week: number;
    week_target: number;
    days_elapsed: number;
    days_remaining: number;
    days_total: number;
    week_number: number;
    total_weeks: number;
    week_start: string;
    week_end: string;
    run_rate: number;
    projected_by_friday: number;
    needed_per_day: number;
  }
  const [weeklyPace, setWeeklyPace] = useState<WeeklyPace | null>(null);

  // Team pace indicator — for "This Month" or "Campaign"
  const [targetSQLs, setTargetSQLs] = useState<number | null>(null);
  useEffect(() => {
    if (filterType !== "thisMonth" && filterType !== "campaign") { setTargetSQLs(null); return; }
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

  // Weekly pace — only for "This Month" or "Campaign" filter
  useEffect(() => {
    if (filterType !== "thisMonth" && filterType !== "campaign") {
      setWeeklyPace(null);
      return;
    }
    const fetchWeeklyPace = async () => {
      const cid = clientFilter && clientFilter !== "all" ? clientFilter : null;
      const now = new Date();
      let periodStart: Date, periodEnd: Date;
      if (filterType === "campaign" && selectedClient?.campaign_start && selectedClient?.campaign_end) {
        periodStart = new Date(selectedClient.campaign_start + "T00:00:00");
        periodEnd = new Date(selectedClient.campaign_end + "T00:00:00");
      } else {
        periodStart = startOfMonth(now);
        periodEnd = endOfMonth(now);
      }
      const { data, error } = await supabase.rpc("get_weekly_pace", {
        p_client_id: cid,
        p_start_date: format(periodStart, "yyyy-MM-dd"),
        p_end_date: format(periodEnd, "yyyy-MM-dd"),
        p_target_sqls: targetSQLs ?? undefined,
      } as any);
      if (!error && data && data.length > 0) {
        const row = data[0] as any;
        setWeeklyPace({
          sqls_this_week: Number(row.sqls_this_week) || 0,
          week_target: Number(row.week_target) || 0,
          days_elapsed: Number(row.days_elapsed) || 0,
          days_remaining: Number(row.days_remaining) || 0,
          days_total: Number(row.days_total) || 0,
          week_number: Number(row.week_number) || 0,
          total_weeks: Number(row.total_weeks) || 0,
          week_start: row.week_start,
          week_end: row.week_end,
          run_rate: Number(row.run_rate) || 0,
          projected_by_friday: Number(row.projected_by_friday) || 0,
          needed_per_day: Number(row.needed_per_day) || 0,
        });
      } else {
        setWeeklyPace(null);
      }
    };
    fetchWeeklyPace();
  }, [filterType, clientFilter, selectedClient, targetSQLs, refreshKey]);

  const paceData = useMemo(() => {
    if (filterType !== "thisMonth" && filterType !== "campaign") return null;
    const now = new Date();

    let periodStart: Date, periodEnd: Date;
    if (filterType === "campaign" && selectedClient?.campaign_start && selectedClient?.campaign_end) {
      periodStart = new Date(selectedClient.campaign_start + "T00:00:00");
      periodEnd = new Date(selectedClient.campaign_end + "T00:00:00");
    } else {
      periodStart = startOfMonth(now);
      periodEnd = endOfMonth(now);
    }

    const today = now > periodEnd ? periodEnd : now;
    if (today < periodStart) return null;
    
    const allWorkingDays = eachDayOfInterval({ start: periodStart, end: periodEnd }).filter(d => !isWeekend(d));
    const elapsedWorkingDays = eachDayOfInterval({ start: periodStart, end: today }).filter(d => !isWeekend(d)).length;
    const totalWorkingDays = allWorkingDays.length;
    
    const totalSQLs = teamTotals.sqls;
    const totalDials = teamTotals.dials;
    const activeSDRs = leaderboard.length;
    const runRate = elapsedWorkingDays > 0 ? totalSQLs / elapsedWorkingDays : 0;
    const projected = Math.round(runRate * totalWorkingDays);
    const remainingWorkingDays = Math.max(0, totalWorkingDays - elapsedWorkingDays);
    const dialsPerSDRPerDay = elapsedWorkingDays > 0 && activeSDRs > 0 ? totalDials / elapsedWorkingDays / activeSDRs : 0;
    
    const label = filterType === "campaign" ? "Campaign Pace" : "Monthly Pace";
    const endLabel = filterType === "campaign" ? "campaign end" : "month end";
    
    return { totalSQLs, totalDials, activeSDRs, elapsedWorkingDays, totalWorkingDays, remainingWorkingDays, runRate, projected, dialsPerSDRPerDay, label, endLabel };
  }, [filterType, teamTotals.sqls, teamTotals.dials, leaderboard.length, selectedClient]);

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
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => handleViewChange("leaderboard")}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                view === "leaderboard"
                  ? "bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a] border-r border-border"
                  : "bg-card text-muted-foreground hover:text-foreground border-r border-border"
              )}
            >
              SDR Leaderboard
            </button>
            <button
              onClick={() => handleViewChange("heatmap")}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                view === "heatmap"
                  ? "bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a]"
                  : "bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              Team Heatmap
            </button>
          </div>
        </div>
      </div>

      {view === "leaderboard" ? (
        <div className="space-y-6">
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
          {/* Campaign tab — only when a specific client is selected */}
          {selectedClient?.campaign_start && selectedClient?.campaign_end && (() => {
            const campStart = new Date(selectedClient.campaign_start + "T00:00:00");
            const campEnd = new Date(selectedClient.campaign_end + "T00:00:00");
            const isActive = filterType === "campaign";
            return (
              <Button
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => { setDateRange({ from: campStart, to: campEnd }); setFilterType("campaign" as FilterType); setCustomRange(undefined); }}
                className={cn(
                  "transition-all duration-200 min-h-[44px] active:scale-95 text-xs sm:text-sm",
                  isActive
                    ? "bg-[#0f172a] hover:bg-[#0f172a] text-white font-semibold shadow-sm dark:bg-white dark:hover:bg-white dark:text-[#0f172a]"
                    : "bg-transparent text-muted-foreground border border-border hover:bg-muted/50 hover:text-foreground"
                )}
              >
                Campaign
              </Button>
            );
          })()}
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

          {/* Export — right-aligned, hidden for SDR role */}
          {!isSdr && (
            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    disabled={loading || leaderboard.length === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100 font-medium text-sm transition-colors disabled:opacity-50 min-h-[44px]"
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
                  <DropdownMenuItem onClick={handleExportExcel}>
                    <Table2 className="h-4 w-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
         {dateRange?.from && dateRange?.to && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>Filtered period: {format(dateRange.from, "MMM dd, yyyy")} – {format(dateRange.to, "MMM dd, yyyy")}{filterType === "campaign" ? " (Campaign)" : ""}</span>
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
            clientLogoMap={clientLogoMap}
            showClientColumn={clientFilter === "all"}
            campaignDates={selectedClient?.campaign_start && selectedClient?.campaign_end ? { start: selectedClient.campaign_start, end: selectedClient.campaign_end } : null}
            clients={clients}
            clientFilter={clientFilter}
            onClientFilterChange={setClientFilter}
            showClientFilter={!isSdr}
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

      {/* Team Pace Indicator — for This Month or Campaign, below Team Totals */}
      {paceData && leaderboard.length > 0 && (
        <div className="bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-5 py-3 space-y-2">
          {/* Line 1: SQL Pace */}
          {targetSQLs && targetSQLs > 0 && paceData.totalSQLs >= targetSQLs ? (
            <p className="text-[13px] text-[#10B981] font-semibold">🎯 Target reached! {paceData.totalSQLs} of {targetSQLs} SQLs</p>
          ) : (
            <p className="text-[13px] text-foreground">
              <span className="font-semibold">{paceData.label}:</span>
              {" "}{paceData.totalSQLs} SQLs in {paceData.elapsedWorkingDays} working days | Run rate: {paceData.runRate.toFixed(2)} SQLs/day | Projected: {paceData.projected} by {paceData.endLabel}
              {targetSQLs && targetSQLs > 0 && (() => {
                if (paceData.remainingWorkingDays > 5) {
                  const needPerDay = (targetSQLs - paceData.totalSQLs) / paceData.remainingWorkingDays;
                  return <> | Need {needPerDay.toFixed(2)}/day to hit target</>;
                }
                if (paceData.remainingWorkingDays > 0) {
                  const pct = Math.min(100, Math.round((paceData.projected / targetSQLs) * 100));
                  return <> | Projected: {paceData.projected} of {targetSQLs} target ({pct}%)</>;
                }
                return null;
              })()}
            </p>
          )}
          {/* Line 2: Day progress */}
          <p className="text-[12px] text-muted-foreground">
            Day {paceData.elapsedWorkingDays} of {paceData.totalWorkingDays} working days ({paceData.totalWorkingDays > 0 ? Math.round((paceData.elapsedWorkingDays / paceData.totalWorkingDays) * 100) : 0}% of {filterType === "campaign" ? "campaign" : "month"} elapsed)
          </p>
          {/* Line 3: Progress bar */}
          {targetSQLs && targetSQLs > 0 && (
            <div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-[#E2E8F0] dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (paceData.totalSQLs / targetSQLs) * 100)}%`,
                      backgroundColor: (() => {
                        const requiredDailyRate = targetSQLs / paceData.totalWorkingDays;
                        const pacePercentage = requiredDailyRate > 0 ? (paceData.runRate / requiredDailyRate) * 100 : 0;
                        if (pacePercentage >= 71) return "#10B981";
                        if (pacePercentage >= 51) return "#F59E0B";
                        return "#EF4444";
                      })(),
                    }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">{Math.min(100, Math.round((paceData.totalSQLs / targetSQLs) * 100))}%</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{paceData.totalSQLs} of {targetSQLs} target SQLs</p>
            </div>
          )}
        </div>
      )}

      {/* Weekly Pace — directly below the Monthly/Campaign Pace card */}
      {weeklyPace && (
        <div className="bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-5 py-3 space-y-2">
          {(() => {
            const wp = weeklyPace;
            const fmtDate = (iso: string) => {
              if (!iso) return "";
              const d = new Date(iso + "T00:00:00");
              return format(d, "d MMM");
            };
            const roundedTarget = Math.round(wp.week_target);
            const targetHit = roundedTarget > 0 && wp.sqls_this_week >= roundedTarget;
            const weekComplete = wp.days_remaining === 0 && !targetHit;
            const notStarted = wp.days_elapsed === 0;

            const pct = roundedTarget > 0
              ? Math.min(100, (wp.sqls_this_week / roundedTarget) * 100)
              : 0;
            const displayPct = targetHit ? 100 : pct;
            const formatNeeded = (n: number) => parseFloat(n.toFixed(1)).toString();

            const barColor = (() => {
              if (targetHit) return "#10B981";
              if (displayPct >= 71) return "#10B981";
              if (displayPct >= 51) return "#F59E0B";
              return "#EF4444";
            })();

            const displayRunRate = notStarted ? 0 : wp.run_rate;
            const displayProjected = notStarted ? 0 : wp.projected_by_friday;

            const weekEndDayLabel = wp.week_end
              ? format(new Date(wp.week_end + "T00:00:00"), "EEE")
              : "Fri";

            return (
              <>
                {/* Line 1: Summary */}
                <p className="text-[13px] text-foreground">
                  <span className="font-semibold">Weekly Pace:</span>
                  {" "}{wp.sqls_this_week} SQLs this week | Run rate: {displayRunRate.toFixed(2)}/day | Projected: {displayProjected} by Friday
                  {targetHit ? (
                    <> | <span className="font-semibold text-[#10B981]">Week target hit!</span></>
                  ) : weekComplete ? (
                    <> | Week complete</>
                  ) : notStarted ? (
                    <> | Week just started</>
                  ) : (
                    <> | Need {formatNeeded(wp.needed_per_day)}/day to hit week target</>
                  )}
                </p>
                {/* Line 2: Sub-line */}
                <p className="text-[12px] text-muted-foreground">
                  Week {wp.week_number} of {wp.total_weeks} · Mon {fmtDate(wp.week_start)} – {weekEndDayLabel} {fmtDate(wp.week_end)} · {wp.days_remaining} working day{wp.days_remaining === 1 ? "" : "s"} remaining
                </p>
                {/* Line 3: Progress bar */}
                {wp.week_target > 0 && (
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-[#E2E8F0] dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${displayPct}%`, backgroundColor: barColor }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">{Math.round(displayPct)}%</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{wp.sqls_this_week} of {roundedTarget} weekly target SQLs</p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* SDR Activity Breakdown Chart */}
      {activityChartData.length > 0 ? (
        <SDRActivityChart chartData={activityChartData} clientLogoMap={clientLogoMap} />
      ) : null}
        </div>
      ) : (
        <TeamHeatmap clients={clients} />
      )}
    </div>
  );
};

export default TeamPerformance;
