import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CalendarIcon, Phone, CheckCircle, Mail, Target, TrendingUp, Calendar as CalendarDaysIcon } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { ClientSQLMeetingsTable } from "@/components/ClientSQLMeetingsTable";

const ClientView = () => {
  const { clientSlug } = useParams();
  const navigate = useNavigate();
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(2025, 9, 4), // October 4, 2025
    to: new Date(2025, 10, 3), // November 3, 2025
  });

  const [lastUpdated] = useState(new Date());

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
      {/* Header with Back Button and Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
            <h1 className="text-3xl font-bold text-foreground">{clientName}</h1>
            <p className="text-sm text-muted-foreground">
              Last Updated: {format(lastUpdated, "MMMM dd, yyyy, h:mm a")} AEDT
            </p>
          </div>
        </div>

        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal border-border bg-card hover:bg-muted/50",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "MMM dd, yyyy")} - {format(date.to, "MMM dd, yyyy")}
                  </>
                ) : (
                  format(date.from, "MMM dd, yyyy")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card border-border z-[100]" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Date Range Note */}
      <div className="text-sm text-muted-foreground bg-muted/20 border border-border rounded-lg px-4 py-2">
        Showing data for {date?.from && format(date.from, "MMM d")} - {date?.to && format(date.to, "MMM d, yyyy")}
      </div>

      {/* Section 1: KPIs - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      {/* Section 2: Client-specific SQL Booked Meetings Table */}
      <ClientSQLMeetingsTable clientSlug={clientSlug || ""} />
    </div>
  );
};

export default ClientView;
