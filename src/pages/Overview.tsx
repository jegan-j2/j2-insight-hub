import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, Phone, PhoneIncoming, TrendingUp, Handshake, Target, Calendar as CalendarDaysIcon, AlertCircle, RefreshCw, DatabaseZap, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CallActivityChart } from "@/components/CallActivityChart";
import { ConversionFunnelChart } from "@/components/ConversionFunnelChart";
import { ClientPerformanceTable } from "@/components/ClientPerformanceTable";
import { SQLBookedMeetingsTable } from "@/components/SQLBookedMeetingsTable";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { KPICardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/LoadingSkeletons";
import { EmptyState } from "@/components/EmptyState";
import { useOverviewData } from "@/hooks/useOverviewData";
import { toCSV, downloadCSV, formatDateForCSV } from "@/lib/csvExport";

import { useToast } from "@/hooks/use-toast";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

const Overview = () => {
  const { dateRange, setDateRange, filterType, setFilterType } = useDateFilter();
  const { kpis, snapshots, meetings, loading, error, refetch } = useOverviewData(dateRange, filterType);
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  
  const { refreshKey, manualRefresh } = useAutoRefresh(300000);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getDelta = (current: number, previous: number) => {
    if (!kpis.previousPeriod || previous === 0) return null;
    const delta = ((current - previous) / previous) * 100;
    return delta;
  };

  const getPeriodLabel = () => {
    if (filterType === "last7days") return "vs previous 7 days";
    if (filterType === "last30days") return "vs previous 30 days";
    if (filterType === "thisMonth") return "vs last month";
    if (filterType === "lastMonth") return "vs 2 months ago";
    return "vs previous period";
  };

  // Auto-refresh trigger
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
      const startStr = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "all";
      const endStr = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "all";

      // KPI summary section
      const kpiHeaders = ["Metric", "Value"];
      const kpiRows = [
        ["Total Dials", kpis.totalDials],
        ["Total Answered", kpis.totalAnswered],
        ["Answer Rate (%)", kpis.answerRate],
        ["Total DMs Reached", kpis.totalDMs],
        ["Total SQLs Generated", kpis.totalSQLs],
        ["SQL Conversion Rate (%)", kpis.sqlConversionRate],
      ];

      // Client performance section - aggregate snapshots by client
      const clientMap = new Map<string, { dials: number; answered: number; dms: number; sqls: number }>();
      snapshots.forEach(s => {
        const existing = clientMap.get(s.client_id) || { dials: 0, answered: 0, dms: 0, sqls: 0 };
        existing.dials += s.dials || 0;
        existing.answered += s.answered || 0;
        existing.dms += s.dms_reached || 0;
        existing.sqls += s.sqls || 0;
        clientMap.set(s.client_id, existing);
      });

      const clientHeaders = ["Client", "Dials", "Answered", "DMs Reached", "SQLs"];
      const clientRows = Array.from(clientMap.entries()).map(([client, data]) => [
        client, data.dials, data.answered, data.dms, data.sqls,
      ]);

      // Meetings section
      const meetingHeaders = ["Booking Date", "Client", "SDR", "Contact Person", "Company", "Meeting Date", "Meeting Held"];
      const meetingRows = meetings.map(m => [
        formatDateForCSV(m.booking_date),
        m.client_id || "",
        m.sdr_name || "",
        m.contact_person,
        m.company_name || "",
        formatDateForCSV(m.meeting_date),
        m.meeting_held ? "Yes" : "No",
      ]);

      const sections = [
        "=== KPI SUMMARY ===",
        toCSV(kpiHeaders, kpiRows),
        "",
        "=== CLIENT PERFORMANCE ===",
        toCSV(clientHeaders, clientRows),
        "",
        "=== SQL MEETINGS ===",
        toCSV(meetingHeaders, meetingRows),
      ];

      downloadCSV(sections.join("\n"), `j2-overview-${startStr}-${endStr}.csv`);
      toast({ title: "CSV downloaded successfully", className: "border-green-500" });
    } finally {
      setExporting(false);
    }
  };


  useEffect(() => {
    document.title = "J2 Insights Dashboard - Overview";
  }, []);

  // KPI Cards driven by Supabase data
  const kpiCards = [
    {
      title: "Total Dials",
      value: kpis.totalDials.toLocaleString(),
      icon: Phone,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10",
      delta: kpis.previousPeriod ? getDelta(kpis.totalDials, kpis.previousPeriod.totalDials) : null,
      tealValue: false,
    },
    {
      title: "Total Answered",
      value: kpis.totalAnswered.toLocaleString(),
      icon: PhoneIncoming,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
      delta: kpis.previousPeriod ? getDelta(kpis.totalAnswered, kpis.previousPeriod.totalAnswered) : null,
      tealValue: false,
    },
    {
      title: "Avg Answer Rate",
      value: `${kpis.answerRate}%`,
      icon: TrendingUp,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-500/10",
      delta: kpis.previousPeriod ? getDelta(parseFloat(kpis.answerRate), kpis.previousPeriod.answerRate) : null,
      tealValue: false,
    },
    {
      title: "Total Conversations",
      value: kpis.totalConversations.toLocaleString(),
      icon: Handshake,
      iconColor: "text-indigo-500",
      iconBg: "bg-indigo-500/10",
      delta: kpis.previousPeriod ? getDelta(kpis.totalConversations, kpis.previousPeriod.totalConversations) : null,
      tealValue: true,
    },
    {
      title: "Total SQLs",
      value: kpis.totalSQLs.toLocaleString(),
      
      icon: Target,
      iconColor: "text-rose-500",
      iconBg: "bg-rose-500/10",
      delta: kpis.previousPeriod ? getDelta(kpis.totalSQLs, kpis.previousPeriod.totalSQLs) : null,
      tealValue: true,
    },
  ];

  return (
    <div id="overview-content" className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Overview Dashboard</h1>
          <p className="text-muted-foreground">Monitor all client campaigns and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={loading || exporting || snapshots.length === 0}
            className="gap-2 shrink-0"
          >
           {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export CSV
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
        {dateRange?.from && dateRange?.to && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/20 border border-border rounded-lg px-4 py-2 transition-all duration-200">
            <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
            <span>
              {format(dateRange.from, "MMM dd, yyyy")} – {format(dateRange.to, "MMM dd, yyyy")}
            </span>
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

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 animate-fade-in">
          {kpiCards.map((kpi) => (
            <Card
              key={kpi.title}
              className="bg-card border-border hover:shadow-lg transition-all duration-300 hover:scale-[1.02] overflow-hidden group"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("p-3 rounded-lg", kpi.iconBg)}>
                    <kpi.icon className={cn("h-5 w-5", kpi.iconColor)} />
                  </div>
                  {kpi.delta !== null ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-default">
                            {kpi.delta >= 0 ? (
                              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-destructive" />
                            )}
                            <span className={cn(
                              "text-sm font-medium",
                              kpi.delta >= 0 ? "text-emerald-500" : "text-destructive"
                            )}>
                              {kpi.delta >= 0 ? "+" : ""}{kpi.delta.toFixed(1)}%
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {getPeriodLabel()}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <div className="h-6" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-extrabold text-[#0f172a] dark:text-[#f1f5f9]">{kpi.value}</p>
                  <p className="text-sm font-normal text-[#64748b] dark:text-white/60">{kpi.title}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && snapshots.length === 0 && (
        <EmptyState
          icon={DatabaseZap}
          title="No data available for selected date range"
          description="Data will appear once the backend database is populated. This is expected during initial setup."
          actionLabel="Refresh"
          onAction={refetch}
        />
      )}

      {/* Charts Section */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <CallActivityChart snapshots={snapshots} />
          <ConversionFunnelChart snapshots={snapshots} />
        </div>
      )}

      {/* Tables */}
      {loading ? (
        <>
          <TableSkeleton />
          <TableSkeleton />
        </>
      ) : (
        <>
          <ClientPerformanceTable snapshots={snapshots} meetings={meetings} />
          <SQLBookedMeetingsTable dateRange={dateRange} meetings={meetings} />
        </>
      )}
    </div>
  );
};

export default Overview;
