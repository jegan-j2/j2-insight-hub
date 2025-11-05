import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarDaysIcon } from "lucide-react";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { SDRActivityChart } from "@/components/SDRActivityChart";
import { SDRLeaderboardTable } from "@/components/SDRLeaderboardTable";
import { SDRQuickStatsCards } from "@/components/SDRQuickStatsCards";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KPICardSkeleton, ChartSkeleton } from "@/components/LoadingSkeletons";
import { useState, useEffect } from "react";

const TeamPerformance = () => {
  const { dateRange, setDateRange } = useDateFilter();
  const [isLoading, setIsLoading] = useState(false);
  const [showContent, setShowContent] = useState(true);

  useEffect(() => {
    // Simulate loading when date changes
    setShowContent(false);
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
      setShowContent(true);
    }, 800);
    return () => clearTimeout(timer);
  }, [dateRange]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Sales Development Team Performance</h1>
        <p className="text-muted-foreground">Monitor individual SDR performance across all clients</p>
      </div>

      {/* Date Range Picker with Quick Filters */}
      <div className="space-y-3">
        <DateRangePicker 
          date={dateRange} 
          onDateChange={setDateRange}
          className="w-full"
        />
        
        {/* Selected Date Range Display and Client Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {dateRange?.from && dateRange?.to && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/20 border border-border rounded-lg px-4 py-2">
              <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
              <span>
                Performance data for: {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
              </span>
            </div>
          )}
          
          {/* Client Filter */}
          <Select defaultValue="all">
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by client" />
            </SelectTrigger>
            <SelectContent>
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

      {/* Top Section: Leaderboard + Quick Stats */}
      {!showContent ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartSkeleton />
          </div>
          <div className="lg:col-span-1">
            <KPICardSkeleton />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SDR Leaderboard - Takes 2 columns on desktop */}
          <div className="lg:col-span-2">
            <SDRLeaderboardTable />
          </div>

          {/* Quick Stat Cards - Takes 1 column on desktop */}
          <div className="lg:col-span-1">
            <SDRQuickStatsCards />
          </div>
        </div>
      )}

      {/* SDR Activity Breakdown Chart - Full Width */}
      {!showContent ? (
        <ChartSkeleton />
      ) : (
        <SDRActivityChart />
      )}
    </div>
  );
};

export default TeamPerformance;
