import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import type { DailySnapshot } from "@/lib/supabase-types";
import { parseISO, isAfter, subDays } from "date-fns";
import { EmptyState } from "@/components/EmptyState";

interface ClientWeeklyComparisonChartProps {
  snapshots?: DailySnapshot[];
}

const chartConfig = {
  thisWeek: { label: "This Week", color: "hsl(var(--secondary))" },
  lastWeek: { label: "Last Week", color: "hsl(var(--muted))" },
};

export const ClientWeeklyComparisonChart = ({ snapshots }: ClientWeeklyComparisonChartProps) => {
  const chartData = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return [];

    const now = new Date();
    const oneWeekAgo = subDays(now, 7);
    const twoWeeksAgo = subDays(now, 14);

    const thisWeekData = snapshots.filter(s => isAfter(parseISO(s.snapshot_date), oneWeekAgo));
    const lastWeekData = snapshots.filter(s => {
      const d = parseISO(s.snapshot_date);
      return isAfter(d, twoWeeksAgo) && !isAfter(d, oneWeekAgo);
    });

    const sum = (arr: DailySnapshot[], key: keyof DailySnapshot) =>
      arr.reduce((s, item) => s + (Number(item[key]) || 0), 0);

    const metrics = [
      { metric: "Dials", key: "dials" as const },
      { metric: "Answered", key: "answered" as const },
      { metric: "DM Conversations", key: "dms_reached" as const },
      { metric: "SQLs", key: "sqls" as const },
    ];

    return metrics.map(({ metric, key }) => {
      const tw = sum(thisWeekData, key);
      const lw = sum(lastWeekData, key);
      const change = lw > 0 ? ((tw - lw) / lw * 100) : 0;
      return { metric, thisWeek: tw, lastWeek: lw, change: parseFloat(change.toFixed(1)) };
    });
  }, [snapshots]);

  const CustomLabel = (props: any) => {
    const { x, y, width, value, dataKey } = props;
    const data = chartData.find(d => d.thisWeek === value || d.lastWeek === value);
    if (!data || dataKey !== "thisWeek") return null;
    const changeColor = data.change > 0 ? "hsl(var(--secondary))" : data.change < 0 ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))";
    const changeText = data.change > 0 ? `+${data.change.toFixed(1)}%` : `${data.change.toFixed(1)}%`;
    return (
      <text x={x + width / 2} y={y - 10} fill={changeColor} fontSize={12} fontWeight="600" textAnchor="middle">
        {changeText}
      </text>
    );
  };

  if (chartData.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border animate-fade-in">
        <CardHeader>
          <CardTitle className="text-foreground">Week-over-Week Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={BarChart3}
            title="No comparison data"
            description="Weekly comparison will appear once sufficient data is available"
          />
        </CardContent>
      </Card>
    );
  }

  const avgDialsChange = chartData[0]?.change ?? 0;
  const sqlsChange = chartData[4]?.change ?? 0;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border animate-fade-in" role="img" aria-label="Week-over-week performance comparison chart">
      <CardHeader>
        <CardTitle className="text-foreground">Week-over-Week Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full" style={{ height: "350px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", color: "hsl(var(--popover-foreground))" }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: any, name: string) => [value, name === "thisWeek" ? "This Week" : "Last Week"]}
              />
              <Legend wrapperStyle={{ paddingTop: "20px", fontSize: "14px" }} />
              <Bar dataKey="lastWeek" fill={chartConfig.lastWeek.color} name={chartConfig.lastWeek.label} radius={[4, 4, 0, 0]} />
              <Bar dataKey="thisWeek" fill={chartConfig.thisWeek.color} name={chartConfig.thisWeek.label} radius={[4, 4, 0, 0]}>
                <LabelList content={<CustomLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 p-3 rounded-lg bg-muted/20 border border-border">
          <div className="flex items-start gap-2">
            {avgDialsChange > 0 ? (
              <TrendingUp className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
            ) : (
              <TrendingDown className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            )}
            <p className="text-sm text-foreground">
              <span className="font-semibold">This week: </span>
              <span className="text-secondary font-medium">{avgDialsChange > 0 ? '+' : ''}{avgDialsChange.toFixed(1)}%</span> improvement in dials
              {sqlsChange !== 0 && (
                <>
                  {", "}
                  <span className={sqlsChange > 0 ? "text-secondary" : "text-destructive"} style={{ fontWeight: 500 }}>
                    {sqlsChange > 0 ? '+' : ''}{sqlsChange.toFixed(1)}%
                  </span> in SQLs
                </>
              )}
              {sqlsChange === 0 && ", SQLs remain steady"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
