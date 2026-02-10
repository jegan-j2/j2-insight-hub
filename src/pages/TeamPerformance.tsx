import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarDaysIcon, AlertCircle, RefreshCw, DatabaseZap } from "lucide-react";
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

const TeamPerformance = () => {
  const { dateRange, setDateRange, filterType, setFilterType } = useDateFilter();
  const [clientFilter, setClientFilter] = useState("all");
  const { loading, error, leaderboard, activityChartData, refetch } = useTeamPerformanceData(dateRange, clientFilter);

  useEffect(() => {
    document.title = "J2 Dashboard - Team Performance";
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          <span className="hidden sm:inline">Sales Development Team Performance</span>
          <span className="sm:hidden">Team Performance</span>
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">Monitor individual SDR performance across all clients</p>
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
              <SelectItem value="inxpress">Inxpress</SelectItem>
              <SelectItem value="congero">Congero</SelectItem>
              <SelectItem value="techcorp">TechCorp Solutions</SelectItem>
              <SelectItem value="global">Global Logistics</SelectItem>
              <SelectItem value="finserve">FinServe Group</SelectItem>
              <SelectItem value="healthcare">HealthCare Plus</SelectItem>
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
          icon={DatabaseZap}
          title="No team performance data available"
          description="Data will appear once the backend database is populated. This is expected during initial setup."
          actionLabel="Refresh"
          onAction={refetch}
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
