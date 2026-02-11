import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { EmptyState } from "@/components/EmptyState";
import { TrendingUp } from "lucide-react";

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

export const SDRActivityChart = ({ chartData }: SDRActivityChartProps) => {
  const data = chartData || [];

  return (
    <Card className="bg-card border-border shadow-sm hover:border-yellow-500/20 transition-all">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">SDR Activity Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState 
            icon={TrendingUp}
            title="No activity data yet"
            description="SDR activity data will appear once team members start making calls"
          />
        ) : (
          <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" className="text-xs" />
            <YAxis type="category" dataKey="name" className="text-xs" width={110} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="circle"
            />
            <Bar dataKey="dials" stackId="a" fill="#3B82F6" name="Dials" radius={[0, 0, 0, 0]} />
            <Bar dataKey="answered" stackId="a" fill="#10B981" name="Answered" radius={[0, 0, 0, 0]} />
            <Bar dataKey="dms" stackId="a" fill="#06B6D4" name="DMs Reached" radius={[0, 0, 0, 0]} />
            <Bar dataKey="sqls" stackId="a" fill="#8B5CF6" name="SQLs Generated" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
