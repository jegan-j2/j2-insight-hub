import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Phone, CheckCircle, Mail, Target, TrendingUp, Calendar as CalendarDaysIcon } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { ClientSQLMeetingsTable } from "@/components/ClientSQLMeetingsTable";
import { DateRangePicker } from "@/components/DateRangePicker";
import { KPICardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/LoadingSkeletons";
import { ClientCallActivityChart } from "@/components/ClientCallActivityChart";
import { ClientWeeklyComparisonChart } from "@/components/ClientWeeklyComparisonChart";
import { ClientBanner } from "@/components/ClientBanner";

const ClientView = () => {
  const { clientSlug } = useParams();
  const navigate = useNavigate();
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(2025, 9, 4), // October 4, 2025
    to: new Date(2025, 10, 3), // November 3, 2025
  });

  const [lastUpdated] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [showContent, setShowContent] = useState(true);

  useEffect(() => {
    // Simulate loading when date changes
    setShowContent(false);
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
      setShowContent(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [date]);

  // Mock client data - in a real app, this would come from an API
  const clientNames: Record<string, string> = {
    "inxpress": "Inxpress",
    "congero": "Congero",
    "techcorp-solutions": "TechCorp Solutions",
    "global-logistics": "Global Logistics",
    "finserve-group": "FinServe Group",
    "healthcare-plus": "HealthCare Plus",
  };

  const clientName = clientNames[clientSlug || ""] || "Unknown Client";

  useEffect(() => {
    document.title = `J2 Dashboard - ${clientName}`;
  }, [clientName]);

  // KPI Data for Inxpress
  const kpiData = {
    dials: 861,
    answered: 161,
    answeredPercent: 18.70,
    dmsReached: 59,
    mqls: 21,
    mqlsOnDmsPercent: 35.59,
    mqlsOnDialsPercent: 2.44,
    sqls: 6,
    sqlsOnDmsPercent: 10.17,
    sqlsOnDialsPercent: 0.70,
  };

  // Campaign Target Data
  const campaignData = {
    startDate: new Date(2025, 9, 4), // October 4
    endDate: new Date(2025, 10, 3), // November 3
    target: 16,
    sqlsGenerated: 6,
    leadsRemaining: 10,
  };

  const daysRemaining = differenceInDays(campaignData.endDate, new Date());
  const avgDailyLeadsRequired = daysRemaining > 0 ? (campaignData.leadsRemaining / daysRemaining).toFixed(2) : "0.00";
  const progressPercent = (campaignData.sqlsGenerated / campaignData.target) * 100;

  const kpiCards = [
    { label: "Dials", value: kpiData.dials, icon: Phone, color: "text-secondary", bgColor: "bg-secondary/10" },
    { label: "Answered", value: kpiData.answered, subtitle: `${kpiData.answeredPercent.toFixed(2)}%`, icon: CheckCircle, color: "text-accent", bgColor: "bg-accent/10" },
    { label: "DMs Reached", value: kpiData.dmsReached, icon: Mail, color: "text-secondary", bgColor: "bg-secondary/10" },
    { label: "MQLs on DMs Reached", value: kpiData.mqls, subtitle: `${kpiData.mqlsOnDmsPercent.toFixed(2)}%`, icon: TrendingUp, color: "text-accent", bgColor: "bg-accent/10" },
    { label: "MQLs on Dials", value: kpiData.mqls, subtitle: `${kpiData.mqlsOnDialsPercent.toFixed(2)}%`, icon: TrendingUp, color: "text-secondary", bgColor: "bg-secondary/10" },
    { label: "SQLs on DMs Reached", value: kpiData.sqls, subtitle: `${kpiData.sqlsOnDmsPercent.toFixed(2)}%`, icon: Target, color: "text-accent", bgColor: "bg-accent/10" },
    { label: "SQLs on Dials", value: kpiData.sqls, subtitle: `${kpiData.sqlsOnDialsPercent.toFixed(2)}%`, icon: Target, color: "text-secondary", bgColor: "bg-secondary/10" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Client Banner */}
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
            Last Updated: {format(lastUpdated, "MMMM dd, yyyy, h:mm a")} AEDT
          </p>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="space-y-3">
        <DateRangePicker 
          date={date} 
          onDateChange={setDate}
          className="w-full"
        />
        
        {/* Campaign Period Display */}
        {date?.from && date?.to && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/20 border border-border rounded-lg px-4 py-2">
            <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
            <span>
              Campaign Period: {format(date.from, "MMM dd")} - {format(date.to, "MMM dd, yyyy")}
            </span>
          </div>
        )}
      </div>

      {/* Section 1: KPIs - Two Column Layout */}
      {!showContent ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>
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
              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/20 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDaysIcon className="h-4 w-4 text-secondary" />
                    <p className="text-sm text-muted-foreground">Start Date</p>
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {format(campaignData.startDate, "MMM d")}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/20 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDaysIcon className="h-4 w-4 text-accent" />
                    <p className="text-sm text-muted-foreground">End Date</p>
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {format(campaignData.endDate, "MMM d")}
                  </p>
                </div>
              </div>

              {/* Target Progress */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Target SQLs</p>
                  <p className="text-2xl font-bold text-foreground">{campaignData.target}</p>
                </div>
                <Progress value={progressPercent} className="h-3" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium text-foreground">{progressPercent.toFixed(1)}%</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-secondary/10 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">SQLs Generated</p>
                  <p className="text-2xl font-bold text-secondary">{campaignData.sqlsGenerated}</p>
                </div>
                <div className="p-4 rounded-lg bg-accent/10 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Leads Remaining</p>
                  <p className="text-2xl font-bold text-accent">{campaignData.leadsRemaining}</p>
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section 2: Charts */}
      {!showContent ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <ClientCallActivityChart />
          <ClientWeeklyComparisonChart />
        </div>
      )}

      {/* Section 3: Client-specific SQL Booked Meetings Table */}
      {!showContent ? (
        <TableSkeleton />
      ) : (
        <ClientSQLMeetingsTable clientSlug={clientSlug || ""} dateRange={date} />
      )}
    </div>
  );
};

export default ClientView;
