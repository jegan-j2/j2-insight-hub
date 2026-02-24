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
import { exportToPDF } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

const Overview = () => {
  const { dateRange, setDateRange, filterType, setFilterType } = useDateFilter();
  const { kpis, snapshots, meetings, loading, error, refetch } = useOverviewData(dateRange);
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const { refreshKey, manualRefresh } = useAutoRefresh(300000);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const dateStr = format(new Date(), "yyyy-MM-dd");
      await exportToPDF('overview-content', `j2-overview-${dateStr}.pdf`, 'Campaign Overview');
      toast({ title: "PDF downloaded successfully", className: "border-green-500" });
    } catch (err) {
      toast({ title: "PDF export failed", description: String(err), variant: "destructive" });
    } finally {
      setExportingPDF(false);
    }
  };

  useEffect(() => {
    document.title = "J2 Dashboard - Overview";
  }, []);

  // KPI Cards driven by Supabase data
  const kpiCards = [
    {
      title: "Total Dials",
      value: kpis.totalDials.toLocaleString(),
      icon: Phone,
      trend: "--",
      trendUp: true,
      trendLabel: "vs previous period",
      tealValue: false,
    },
    {
      title: "Total Answered",
      value: kpis.totalAnswered.toLocaleString(),
      subtitle: `${kpis.answerRate}% rate`,
      icon: PhoneIncoming,
      trend: "--",
      trendUp: true,
      trendLabel: "vs previous period",
      tealValue: false,
    },
    {
      title: "Avg Answer Rate",
      value: `${kpis.answerRate}%`,
      icon: TrendingUp,
      trend: "--",
      trendUp: true,
      trendLabel: "vs previous period",
      tealValue: false,
    },
    {
      title: "Total Conversations",
      value: kpis.totalDMs.toLocaleString(),
      icon: Handshake,
      trend: "--",
      trendUp: true,
      trendLabel: "vs previous period",
      tealValue: true,
    },
    {
      title: "Total SQLs",
      value: kpis.totalSQLs.toLocaleString(),
      subtitle: `${kpis.sqlConversionRate}% conversion`,
      icon: Target,
      trend: "--",
      trendUp: true,
      trendLabel: "vs previous period",
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
                  <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin text-cyan-500")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh data (auto-refreshes every 5 mins)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={loading || exporting || snapshots.length === 0}
            className="gap-2 shrink-0"
          >
           {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={loading || exportingPDF || snapshots.length === 0}
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
        {dateRange?.from && dateRange?.to && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/20 border border-border rounded-lg px-4 py-2 transition-all duration-200">
            <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
            <span>
              Showing data from {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
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
                  <div className="p-3 rounded-lg bg-muted">
                    <kpi.icon className="h-5 w-5 text-[#0f172a]/70 dark:text-white/60" />
                  </div>
                  <div className="flex items-center gap-1">
                    {kpi.trendUp ? (
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-destructive" />
                    )}
                    <span className={cn("text-sm font-medium", kpi.trendUp ? "text-muted-foreground" : "text-destructive")}>
                      {kpi.trend}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-[#0f172a] dark:text-[#f1f5f9]">{kpi.value}</p>
                  <p className="text-sm font-medium text-[#64748b] dark:text-white/45">{kpi.title}</p>
                  {kpi.subtitle && (
                    <p className="text-xs text-[#64748b] dark:text-white/45">{kpi.subtitle}</p>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">{kpi.trendLabel}</p>
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
