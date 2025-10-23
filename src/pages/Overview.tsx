import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Users, TrendingUp, Target, Phone, CheckCircle, Mail, DollarSign, Calendar as CalendarDaysIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { CallActivityChart } from "@/components/CallActivityChart";
import { ConversionFunnelChart } from "@/components/ConversionFunnelChart";
import { ClientPerformanceTable } from "@/components/ClientPerformanceTable";
import { SQLBookedMeetingsTable } from "@/components/SQLBookedMeetingsTable";

const Overview = () => {
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(2025, 9, 14), // October 14, 2025
    to: new Date(2025, 9, 21), // October 21, 2025
  });

  // KPI Cards Data
  const kpiCards = [
    {
      title: "Total Dials",
      value: "1,735",
      icon: Phone,
      trend: "+8%",
      trendUp: true,
      trendLabel: "vs last week",
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Total Answered",
      value: "406",
      subtitle: "23.4% rate",
      icon: CheckCircle,
      trend: "+5.2%",
      trendUp: true,
      trendLabel: "vs last week",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Total DMs Reached",
      value: "281",
      icon: Mail,
      trend: "+12%",
      trendUp: true,
      trendLabel: "vs last week",
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Total SQLs Generated",
      value: "46",
      subtitle: "16.4% conversion",
      icon: Target,
      trend: "+3.8%",
      trendUp: true,
      trendLabel: "vs last week",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  ];

  const stats = [
    {
      title: "Total Leads Generated",
      value: "45,580",
      icon: Users,
      trend: "+12.5%",
      color: "text-secondary",
      description: "Across all clients",
    },
    {
      title: "Average Client ROI",
      value: "486%",
      icon: TrendingUp,
      trend: "+8.2%",
      color: "text-accent",
      description: "Return on investment",
    },
    {
      title: "Meetings Booked",
      value: "456",
      icon: CalendarDaysIcon,
      trend: "+15.3%",
      color: "text-secondary",
      description: "This month",
    },
    {
      title: "Total Revenue",
      value: "$1.2M",
      icon: DollarSign,
      trend: "+18.7%",
      color: "text-accent",
      description: "Monthly recurring",
    },
  ];

  const clients = [
    { name: "Inxpress", leads: 8240, roi: 520, meetings: 84, status: "active" },
    { name: "Congero", leads: 6890, roi: 468, meetings: 72, status: "active" },
    { name: "TechCorp Solutions", leads: 7150, roi: 492, meetings: 78, status: "active" },
    { name: "Global Logistics", leads: 5920, roi: 445, meetings: 61, status: "active" },
    { name: "FinServe Group", leads: 8890, roi: 534, meetings: 92, status: "active" },
    { name: "HealthCare Plus", leads: 8490, roi: 501, meetings: 69, status: "active" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Date Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Overview Dashboard</h1>
          <p className="text-muted-foreground">Monitor all client campaigns and performance metrics</p>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => (
          <Card
            key={kpi.title}
            className="bg-card border-border hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-fade-in overflow-hidden group"
            style={{ animationDelay: `${index * 100}ms` }}
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card
            key={stat.title}
            className="bg-card/50 backdrop-blur-sm border-border hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 hover:scale-[1.02] animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stat.value}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-secondary flex items-center">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  {stat.trend}
                </p>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: "300ms" }}>
        <CallActivityChart />
        <ConversionFunnelChart />
      </div>

      {/* Client Performance Table */}
      <ClientPerformanceTable />

      {/* SQL Booked Meetings Table */}
      <SQLBookedMeetingsTable />
    </div>
  );
};

export default Overview;
