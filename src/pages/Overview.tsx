import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, Phone, CheckCircle, Mail, Target, Calendar as CalendarDaysIcon, AlertCircle, RefreshCw, DatabaseZap } from "lucide-react";
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

const Overview = () => {
  const { dateRange, setDateRange, filterType, setFilterType } = useDateFilter();
  const { kpis, snapshots, meetings, loading, error, refetch } = useOverviewData(dateRange);

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
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Total Answered",
      value: kpis.totalAnswered.toLocaleString(),
      subtitle: `${kpis.answerRate}% rate`,
      icon: CheckCircle,
      trend: "--",
      trendUp: true,
      trendLabel: "vs previous period",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Total DMs Reached",
      value: kpis.totalDMs.toLocaleString(),
      icon: Mail,
      trend: "--",
      trendUp: true,
      trendLabel: "vs previous period",
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Total SQLs Generated",
      value: kpis.totalSQLs.toLocaleString(),
      subtitle: `${kpis.sqlConversionRate}% conversion`,
      icon: Target,
      trend: "--",
      trendUp: true,
      trendLabel: "vs previous period",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Overview Dashboard</h1>
        <p className="text-muted-foreground">Monitor all client campaigns and performance metrics</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
          {kpiCards.map((kpi) => (
            <Card
              key={kpi.title}
              className="bg-card border-border hover:shadow-lg transition-all duration-300 hover:scale-[1.02] overflow-hidden group"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("p-3 rounded-lg", kpi.bgColor)}>
                    <kpi.icon className={cn("h-5 w-5", kpi.color)} />
                  </div>
                  <div className="flex items-center gap-1">
                    {kpi.trendUp ? (
                      <ArrowUpRight className="h-4 w-4 text-secondary" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-destructive" />
                    )}
                    <span className={cn("text-sm font-medium", kpi.trendUp ? "text-secondary" : "text-destructive")}>
                      {kpi.trend}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  {kpi.subtitle && (
                    <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
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
