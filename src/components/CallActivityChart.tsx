import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { EmptyState } from "@/components/EmptyState";
import { TrendingUp } from "lucide-react";
import type { DailySnapshot } from "@/lib/supabase-types";
import { format, parseISO } from "date-fns";

interface CallActivityChartProps {
  snapshots?: DailySnapshot[];
}

const chartConfig = {
  dials: { label: "Dials", color: "#f59e0b" },
  answered: { label: "Answered", color: "#10b981" },
  dms: { label: "DM Conversations", color: "#6366f1" },
};

export const CallActivityChart = ({ snapshots }: CallActivityChartProps) => {
  const chartData = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return [];

    const grouped: Record<string, { date: string; dials: number; answered: number; dms: number }> = {};
    for (const s of snapshots) {
      const date = s.snapshot_date;
      if (!grouped[date]) {
        grouped[date] = { date, dials: 0, answered: 0, dms: 0 };
      }
      grouped[date].dials += s.dials || 0;
      grouped[date].answered += s.answered || 0;
      grouped[date].dms += s.dms_reached || 0;
    }

    return Object.values(grouped)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        ...d,
        date: format(parseISO(d.date), "MMM d"),
      }));
  }, [snapshots]);

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
          <div role="img" aria-label="Line chart showing call activity trends over time">
            <ChartContainer config={chartConfig} className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
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
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
