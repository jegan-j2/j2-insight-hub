import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

const chartData = [
  { name: "Dials", value: 1735, color: "hsl(var(--secondary))" },
  { name: "Answered", value: 406, color: "hsl(var(--accent))" },
  { name: "DMs Reached", value: 281, color: "hsl(var(--primary))" },
  { name: "MQLs", value: 89, color: "hsl(var(--chart-1))" },
  { name: "SQLs", value: 46, color: "hsl(var(--chart-2))" },
];

const chartConfig = {
  dials: {
    label: "Dials",
    color: "hsl(var(--secondary))",
  },
  answered: {
    label: "Answered",
    color: "hsl(var(--accent))",
  },
  dms: {
    label: "DMs Reached",
    color: "hsl(var(--primary))",
  },
  mqls: {
    label: "MQLs",
    color: "hsl(var(--chart-1))",
  },
  sqls: {
    label: "SQLs",
    color: "hsl(var(--chart-2))",
  },
};

export const ConversionFunnelChart = () => {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
};
