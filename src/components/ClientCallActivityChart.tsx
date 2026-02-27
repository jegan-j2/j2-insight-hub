import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { EmptyState } from "@/components/EmptyState";
import { TrendingUp } from "lucide-react";

interface ChartDataPoint {
  date: string;
  dials: number;
  answered: number;
  dms: number;
  sqls: number;
}

interface ClientCallActivityChartProps {
  data?: ChartDataPoint[];
}

const chartConfig = {
  dials: { label: "Dials", color: "hsl(var(--chart-1))" },
  answered: { label: "Answered", color: "hsl(var(--chart-2))" },
  dms: { label: "DM Conversations", color: "hsl(var(--chart-3))" },
  sqls: { label: "SQLs", color: "hsl(var(--chart-4))" },
};

const formatDateLabel = (dateStr: string) => {
  try {
    const parsed = parseISO(dateStr);
    if (!isNaN(parsed.getTime())) return format(parsed, "MMM d");
  } catch {}
  return dateStr;
};

export const ClientCallActivityChart = ({ data }: ClientCallActivityChartProps) => {
  const chartData = data && data.length > 0 ? data : [];

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border animate-fade-in" role="img" aria-label="Daily activity trends chart">
      <CardHeader>
        <CardTitle className="text-foreground">Daily Activity Trends</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No activity data"
            description="Daily activity trends will appear once data is available"
          />
        ) : (
          <div className="w-full" style={{ height: "350px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatDateLabel} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", color: "hsl(var(--popover-foreground))" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  labelFormatter={formatDateLabel}
                />
                <Legend wrapperStyle={{ paddingTop: "20px", fontSize: "14px" }} iconType="line" />
                <Line type="monotone" dataKey="dials" stroke={chartConfig.dials.color} strokeWidth={2} dot={{ fill: chartConfig.dials.color, r: 4 }} activeDot={{ r: 6 }} name={chartConfig.dials.label} />
                <Line type="monotone" dataKey="answered" stroke={chartConfig.answered.color} strokeWidth={2} dot={{ fill: chartConfig.answered.color, r: 4 }} activeDot={{ r: 6 }} name={chartConfig.answered.label} />
                <Line type="monotone" dataKey="dms" stroke={chartConfig.dms.color} strokeWidth={2} dot={{ fill: chartConfig.dms.color, r: 4 }} activeDot={{ r: 6 }} name={chartConfig.dms.label} />
                <Line type="monotone" dataKey="sqls" stroke={chartConfig.sqls.color} strokeWidth={2} dot={{ fill: chartConfig.sqls.color, r: 4 }} activeDot={{ r: 6 }} name={chartConfig.sqls.label} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
