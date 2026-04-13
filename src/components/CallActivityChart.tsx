import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { EmptyState } from "@/components/EmptyState";
import { TrendingUp } from "lucide-react";
import { format, eachDayOfInterval, isBefore, startOfDay, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { DailyActivityRow } from "@/hooks/useOverviewData";

interface CallActivityChartProps {
  dailyActivity?: DailyActivityRow[];
  dateRange?: DateRange;
}

const chartConfig = {
  dials: { label: "Dials", color: "#f59e0b" },
  answered: { label: "Answered", color: "#10b981" },
  dms: { label: "DM Conversations", color: "#6366f1" },
};

export const CallActivityChart = ({ dailyActivity, dateRange }: CallActivityChartProps) => {
  const chartData = useMemo(() => {
    if (!dailyActivity || dailyActivity.length === 0) return [];

    // Build a map of actual data by date
    const grouped: Record<string, { dials: number; answered: number; dms: number }> = {};
    for (const row of dailyActivity) {
      const date = row.activity_day;
      grouped[date] = {
        dials: row.dials,
        answered: row.answered,
        dms: row.dm_conversations,
      };
    }

    // If dateRange provided, fill all dates in range (up to today)
    if (dateRange?.from && dateRange?.to) {
      const today = startOfDay(new Date());
      const end = isBefore(dateRange.to, today) ? dateRange.to : today;
      const allDates = eachDayOfInterval({ start: dateRange.from, end });
      return allDates.map((d) => {
        const key = format(d, "yyyy-MM-dd");
        const entry = grouped[key];
        return {
          date: format(d, "MMM d"),
          dials: entry?.dials || 0,
          answered: entry?.answered || 0,
          dms: entry?.dms || 0,
        };
      });
    }

    // Fallback: just use grouped data
    return Object.keys(grouped)
      .sort()
      .map((date) => ({
        date: format(parseISO(date), "MMM d"),
        dials: grouped[date].dials,
        answered: grouped[date].answered,
        dms: grouped[date].dms,
      }));
  }, [dailyActivity, dateRange]);

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Call Activity Trends</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No activity data"
            description="Call activity trends will appear once data is available"
          />
        ) : (
          <div role="img" aria-label="Line chart showing call activity trends over time" className="w-full">
            <ChartContainer config={chartConfig} className="h-[350px] w-full !aspect-auto">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ color: "hsl(var(--muted-foreground))" }} iconType="line" />
                <Line type="monotone" dataKey="dials" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b", r: 4 }} activeDot={{ r: 6 }} name="Dials" />
                <Line type="monotone" dataKey="answered" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 4 }} activeDot={{ r: 6 }} name="Answered" />
                <Line type="monotone" dataKey="dms" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", r: 4 }} activeDot={{ r: 6 }} name="DM Conversations" />
              </LineChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
