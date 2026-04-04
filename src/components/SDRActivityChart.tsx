import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from "recharts";
import { EmptyState } from "@/components/EmptyState";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChartDataEntry {
  name: string;
  dials: number;
  answered: number;
  dms: number;
  sqls: number;
}

interface SDRActivityChartProps {
  chartData?: ChartDataEntry[];
}

type ViewMode = "volume" | "outcomes";

const COLORS = {
  dials: "#F59E0B",
  answered: "#10B981",
  dms: "#14B8A6",
  sqls: "#F43F5E",
};

export const SDRActivityChart = ({ chartData }: SDRActivityChartProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("volume");
  const data = [...(chartData || [])].sort((a, b) => b.sqls - a.sqls);

  const chartHeight = Math.max(400, data.length * 60);

  return (
    <Card className="bg-card border-border shadow-sm hover:border-yellow-500/20 transition-all">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <CardTitle className="text-xl font-semibold">SDR Activity Breakdown</CardTitle>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === "volume" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => setViewMode("volume")}
          >
            Volume
          </Button>
          <Button
            variant={viewMode === "outcomes" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => setViewMode("outcomes")}
          >
            Outcomes
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No activity data yet"
            description="SDR activity data will appear once team members start making calls"
          />
        ) : (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
              barCategoryGap="20%"
              barGap={2}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-border/50" />
              <XAxis type="number" className="text-xs" tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                className="text-xs"
                width={150}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="circle"
              />
              {viewMode === "volume" ? (
                <>
                  <Bar dataKey="dials" fill={COLORS.dials} name="Dials" radius={[0, 4, 4, 0]} barSize={16}>
                    <LabelList dataKey="dials" position="right" style={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} formatter={(v: number) => v.toLocaleString()} />
                  </Bar>
                  <Bar dataKey="answered" fill={COLORS.answered} name="Answered" radius={[0, 4, 4, 0]} barSize={16}>
                    <LabelList dataKey="answered" position="right" style={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} formatter={(v: number) => v.toLocaleString()} />
                  </Bar>
                </>
              ) : (
                <>
                  <Bar dataKey="dms" fill={COLORS.dms} name="DM Conversations" radius={[0, 4, 4, 0]} barSize={16}>
                    <LabelList dataKey="dms" position="right" style={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  </Bar>
                  <Bar dataKey="sqls" fill={COLORS.sqls} name="SQLs" radius={[0, 4, 4, 0]} barSize={16}>
                    <LabelList dataKey="sqls" position="right" style={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  </Bar>
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
