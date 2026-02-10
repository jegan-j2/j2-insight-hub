import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Phone, CheckCircle, Mail, Target, TrendingUp, Calendar as CalendarDaysIcon, AlertCircle, RefreshCw, DatabaseZap } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { ClientSQLMeetingsTable } from "@/components/ClientSQLMeetingsTable";
import { DateRangePicker } from "@/components/DateRangePicker";
import { KPICardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/LoadingSkeletons";
import { ClientCallActivityChart } from "@/components/ClientCallActivityChart";
import { ClientWeeklyComparisonChart } from "@/components/ClientWeeklyComparisonChart";
import { ClientBanner } from "@/components/ClientBanner";
import { EmptyState } from "@/components/EmptyState";
import { useClientDashboardData } from "@/hooks/useClientDashboardData";

const ClientView = () => {
  const { clientSlug } = useParams();
  const navigate = useNavigate();
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : "";
  const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : "";

  const { loading, error, client, kpis, campaignProgress, snapshots, meetings, chartData, refetch } = 
    useClientDashboardData(clientSlug || "", startDate, endDate);

  const clientName = client?.client_name || clientSlug?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || "Unknown Client";

  useEffect(() => {
    document.title = `J2 Dashboard - ${clientName}`;
  }, [clientName]);

  const campaignStart = campaignProgress?.campaignStart ? new Date(campaignProgress.campaignStart) : null;
  const campaignEnd = campaignProgress?.campaignEnd ? new Date(campaignProgress.campaignEnd) : null;
  const daysRemaining = campaignEnd ? Math.max(0, differenceInDays(campaignEnd, new Date())) : 0;
  const avgDailyLeadsRequired = daysRemaining > 0 && campaignProgress
    ? (campaignProgress.remaining / daysRemaining).toFixed(2) 
    : "0.00";

  const kpiCards = [
    { label: "Dials", value: kpis.totalDials, icon: Phone, color: "text-secondary", bgColor: "bg-secondary/10" },
    { label: "Answered", value: kpis.totalAnswered, subtitle: `${kpis.answerRate}%`, icon: CheckCircle, color: "text-accent", bgColor: "bg-accent/10" },
    { label: "DMs Reached", value: kpis.totalDMs, icon: Mail, color: "text-secondary", bgColor: "bg-secondary/10" },
    { label: "MQLs on DMs Reached", value: kpis.totalMQLs, subtitle: `${kpis.mqlsOnDmsRate}%`, icon: TrendingUp, color: "text-accent", bgColor: "bg-accent/10" },
    { label: "MQLs on Dials", value: kpis.totalMQLs, subtitle: `${kpis.mqlsOnDialsRate}%`, icon: TrendingUp, color: "text-secondary", bgColor: "bg-secondary/10" },
    { label: "SQLs on DMs Reached", value: kpis.totalSQLs, subtitle: `${kpis.sqlsOnDmsRate}%`, icon: Target, color: "text-accent", bgColor: "bg-accent/10" },
    { label: "SQLs on Dials", value: kpis.totalSQLs, subtitle: `${kpis.sqlsOnDialsRate}%`, icon: Target, color: "text-secondary", bgColor: "bg-secondary/10" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <ClientBanner 
        clientSlug={clientSlug || ""}
        clientName={clientName}
        dateRange={date}
      />
      
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/overview")}
          className="text-secondary hover:text-secondary/80"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Overview
        </Button>
        <div className="border-l border-border h-6" />
        <div>
          <p className="text-sm text-muted-foreground">
            Last Updated: {format(new Date(), "MMMM dd, yyyy, h:mm a")} AEDT
          </p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={refetch} className="ml-4 gap-2">
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Date Range Picker */}
      <div className="space-y-3">
        <DateRangePicker 
          date={date} 
          onDateChange={setDate}
          className="w-full"
        />
        
        {date?.from && date?.to && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/20 border border-border rounded-lg px-4 py-2 transition-all duration-200">
            <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
            <span>
              Campaign Period: {format(date.from, "MMM dd, yyyy")} - {format(date.to, "MMM dd, yyyy")}
            </span>
          </div>
        )}
      </div>

      {/* Section 1: KPIs */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>
      ) : !error && snapshots.length === 0 ? (
        <EmptyState
          icon={DatabaseZap}
          title="No campaign data available yet"
          description="Data will appear once HubSpot sync is active for this client"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Left Column - KPIs */}
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Key Performance Indicators</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {kpiCards.map((kpi, index) => (
                <div
                  key={kpi.label}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border hover:shadow-md transition-all duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", kpi.bgColor)}>
                      <kpi.icon className={cn("h-4 w-4", kpi.color)} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{kpi.label}</p>
                      <p className="text-2xl font-bold text-foreground">{kpi.value.toLocaleString()}</p>
                      {kpi.subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5">{kpi.subtitle}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Right Column - Campaign Target */}
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Campaign Target</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {campaignProgress ? (
                <>
                  {campaignStart && campaignEnd && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-muted/20 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <CalendarDaysIcon className="h-4 w-4 text-secondary" />
                          <p className="text-sm text-muted-foreground">Start Date</p>
                        </div>
                        <p className="text-lg font-bold text-foreground">
                          {format(campaignStart, "MMM d")}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/20 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <CalendarDaysIcon className="h-4 w-4 text-accent" />
                          <p className="text-sm text-muted-foreground">End Date</p>
                        </div>
                        <p className="text-lg font-bold text-foreground">
                          {format(campaignEnd, "MMM d")}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Target SQLs</p>
                      <p className="text-2xl font-bold text-foreground">{campaignProgress.target}</p>
                    </div>
                    <Progress value={parseFloat(campaignProgress.percentage)} className="h-3" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium text-foreground">{campaignProgress.percentage}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-secondary/10 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">SQLs Generated</p>
                      <p className="text-2xl font-bold text-secondary">{campaignProgress.achieved}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-accent/10 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Leads Remaining</p>
                      <p className="text-2xl font-bold text-accent">{campaignProgress.remaining}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/20 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Days Remaining</p>
                      <p className="text-2xl font-bold text-foreground">{daysRemaining}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/20 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Avg Daily Required</p>
                      <p className="text-2xl font-bold text-foreground">{avgDailyLeadsRequired}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No campaign target configured</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section 2: Charts */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : snapshots.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <ClientCallActivityChart data={chartData} />
          <ClientWeeklyComparisonChart snapshots={snapshots} />
        </div>
      )}

      {/* Section 3: SQL Booked Meetings Table */}
      {loading ? (
        <TableSkeleton />
      ) : (
        <ClientSQLMeetingsTable clientSlug={clientSlug || ""} dateRange={date} meetings={meetings} />
      )}
    </div>
  );
};

export default ClientView;
