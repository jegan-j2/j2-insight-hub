import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

const chartData = [
  { date: "Oct 15", dials: 240, answered: 58, dms: 38 },
  { date: "Oct 16", dials: 265, answered: 61, dms: 42 },
  { date: "Oct 17", dials: 230, answered: 52, dms: 35 },
  { date: "Oct 18", dials: 280, answered: 68, dms: 48 },
  { date: "Oct 19", dials: 250, answered: 55, dms: 40 },
  { date: "Oct 20", dials: 245, answered: 60, dms: 42 },
  { date: "Oct 21", dials: 225, answered: 52, dms: 36 },
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
};

export const CallActivityChart = () => {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Call Activity Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend 
                wrapperStyle={{ color: "hsl(var(--muted-foreground))" }}
                iconType="line"
              />
              <Line 
                type="monotone" 
                dataKey="dials" 
                stroke="hsl(var(--secondary))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--secondary))", r: 4 }}
                activeDot={{ r: 6 }}
                name="Dials"
              />
              <Line 
                type="monotone" 
                dataKey="answered" 
                stroke="hsl(var(--accent))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--accent))", r: 4 }}
                activeDot={{ r: 6 }}
                name="Answered"
              />
              <Line 
                type="monotone" 
                dataKey="dms" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
                activeDot={{ r: 6 }}
                name="DMs Reached"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
