import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { EmptyState } from "@/components/EmptyState";
import { PieChart as PieChartIcon } from "lucide-react";
import type { DailySnapshot } from "@/lib/supabase-types";

interface ConversionFunnelChartProps {
  snapshots?: DailySnapshot[];
}

const chartConfig = {
  dials: { label: "Dials", color: "#f59e0b" },
  answered: { label: "Answered", color: "#10b981" },
  dms: { label: "DMs Reached", color: "#6366f1" },
  mqls: { label: "MQLs", color: "#f97316" },
  sqls: { label: "SQLs", color: "#f43f5e" },
};

export const ConversionFunnelChart = ({ snapshots }: ConversionFunnelChartProps) => {
  const chartData = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return [];

    return [
      { name: "Dials", value: snapshots.reduce((sum, s) => sum + (s.dials || 0), 0), color: "#f59e0b" },
      { name: "Answered", value: snapshots.reduce((sum, s) => sum + (s.answered || 0), 0), color: "#10b981" },
      { name: "DMs Reached", value: snapshots.reduce((sum, s) => sum + (s.dms_reached || 0), 0), color: "#6366f1" },
      { name: "MQLs", value: snapshots.reduce((sum, s) => sum + (s.mqls || 0), 0), color: "#f97316" },
      { name: "SQLs", value: snapshots.reduce((sum, s) => sum + (s.sqls || 0), 0), color: "#f43f5e" },
    ];
  }, [snapshots]);

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <EmptyState
            icon={PieChartIcon}
            title="No conversion data"
            description="Conversion funnel will appear once data is available"
          />
        ) : (
          <div role="img" aria-label="Pie chart showing conversion funnel distribution">
            <ChartContainer config={chartConfig} className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    labelLine={{ stroke: "hsl(var(--foreground))", strokeWidth: 1 }}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => value.toLocaleString()}
                  />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ color: "hsl(var(--muted-foreground))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
