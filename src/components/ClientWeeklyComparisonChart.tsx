import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

const chartData = [
  {
    metric: "Dials",
    thisWeek: 450,
    lastWeek: 411,
    change: 9.5,
  },
  {
    metric: "Answered",
    thisWeek: 85,
    lastWeek: 76,
    change: 11.8,
  },
  {
    metric: "DMs",
    thisWeek: 28,
    lastWeek: 31,
    change: -9.7,
  },
  {
    metric: "MQLs",
    thisWeek: 11,
    lastWeek: 10,
    change: 10.0,
  },
  {
    metric: "SQLs",
    thisWeek: 3,
    lastWeek: 3,
    change: 0,
  },
];

const chartConfig = {
  thisWeek: {
    label: "This Week",
    color: "hsl(var(--secondary))",
  },
  lastWeek: {
    label: "Last Week",
    color: "hsl(var(--muted))",
  },
};

const CustomLabel = (props: any) => {
  const { x, y, width, value, dataKey } = props;
  const data = chartData.find(d => d.thisWeek === value || d.lastWeek === value);
  
  if (!data || dataKey !== "thisWeek") return null;
  
  const changeColor = data.change > 0 ? "hsl(var(--secondary))" : data.change < 0 ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))";
  const changeText = data.change > 0 ? `+${data.change.toFixed(1)}%` : `${data.change.toFixed(1)}%`;
  
  return (
    <text
      x={x + width / 2}
      y={y - 10}
      fill={changeColor}
      fontSize={12}
      fontWeight="600"
      textAnchor="middle"
    >
      {changeText}
    </text>
  );
};

export const ClientWeeklyComparisonChart = () => {
  const totalImprovement = chartData.reduce((acc, item) => acc + (item.change > 0 ? 1 : 0), 0);
  const avgDialsChange = chartData[0].change;
  const sqlsChange = chartData[4].change;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border animate-fade-in" role="img" aria-label="Week-over-week performance comparison chart">
      <CardHeader>
        <CardTitle className="text-foreground">Week-over-Week Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full" style={{ height: "350px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="metric"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  color: "hsl(var(--popover-foreground))",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: any, name: string) => {
                  const label = name === "thisWeek" ? "This Week" : "Last Week";
                  return [value, label];
                }}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: "20px",
                  fontSize: "14px",
                }}
              />
              <Bar
                dataKey="lastWeek"
                fill={chartConfig.lastWeek.color}
                name={chartConfig.lastWeek.label}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="thisWeek"
                fill={chartConfig.thisWeek.color}
                name={chartConfig.thisWeek.label}
                radius={[4, 4, 0, 0]}
              >
                <LabelList content={<CustomLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Insight */}
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
