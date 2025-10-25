import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const chartData = [
  { date: "Oct 4", dials: 120, answered: 25, dms: 8, sqls: 1 },
  { date: "Oct 5", dials: 135, answered: 28, dms: 10, sqls: 0 },
  { date: "Oct 6", dials: 110, answered: 22, dms: 7, sqls: 1 },
  { date: "Oct 7", dials: 125, answered: 24, dms: 9, sqls: 0 },
  { date: "Oct 8", dials: 115, answered: 23, dms: 8, sqls: 1 },
  { date: "Oct 9", dials: 128, answered: 26, dms: 9, sqls: 1 },
  { date: "Oct 10", dials: 142, answered: 30, dms: 11, sqls: 0 },
  { date: "Oct 11", dials: 118, answered: 24, dms: 8, sqls: 1 },
  { date: "Oct 12", dials: 132, answered: 27, dms: 10, sqls: 0 },
  { date: "Oct 13", dials: 126, answered: 25, dms: 9, sqls: 1 },
  { date: "Oct 14", dials: 121, answered: 23, dms: 8, sqls: 0 },
  { date: "Oct 15", dials: 138, answered: 29, dms: 11, sqls: 1 },
  { date: "Oct 16", dials: 145, answered: 31, dms: 12, sqls: 1 },
  { date: "Oct 17", dials: 130, answered: 26, dms: 9, sqls: 0 },
  { date: "Oct 18", dials: 122, answered: 25, dms: 8, sqls: 1 },
  { date: "Oct 19", dials: 136, answered: 28, dms: 10, sqls: 0 },
  { date: "Oct 20", dials: 129, answered: 27, dms: 9, sqls: 1 },
  { date: "Oct 21", dials: 140, answered: 30, dms: 11, sqls: 1 },
];

const chartConfig = {
  dials: {
    label: "Dials",
    color: "hsl(var(--chart-1))",
  },
  answered: {
    label: "Answered",
    color: "hsl(var(--chart-2))",
  },
  dms: {
    label: "DMs Reached",
    color: "hsl(var(--chart-3))",
  },
  sqls: {
    label: "SQLs",
    color: "hsl(var(--chart-4))",
  },
};

export const ClientCallActivityChart = () => {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border animate-fade-in" role="img" aria-label="Daily activity trends chart">
      <CardHeader>
        <CardTitle className="text-foreground">Daily Activity Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full" style={{ height: "350px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="date"
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
              />
              <Legend
                wrapperStyle={{
                  paddingTop: "20px",
                  fontSize: "14px",
                }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="dials"
                stroke={chartConfig.dials.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.dials.color, r: 4 }}
                activeDot={{ r: 6 }}
                name={chartConfig.dials.label}
              />
              <Line
                type="monotone"
                dataKey="answered"
                stroke={chartConfig.answered.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.answered.color, r: 4 }}
                activeDot={{ r: 6 }}
                name={chartConfig.answered.label}
              />
              <Line
                type="monotone"
                dataKey="dms"
                stroke={chartConfig.dms.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.dms.color, r: 4 }}
                activeDot={{ r: 6 }}
                name={chartConfig.dms.label}
              />
              <Line
                type="monotone"
                dataKey="sqls"
                stroke={chartConfig.sqls.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.sqls.color, r: 4 }}
                activeDot={{ r: 6 }}
                name={chartConfig.sqls.label}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
