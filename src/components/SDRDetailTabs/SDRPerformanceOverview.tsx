import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowUpRight, ArrowDownRight, Phone, CheckCircle, Mail, Target } from "lucide-react";

interface SDRPerformanceOverviewProps {
  sdr: {
    name: string;
    dials: number;
    answered: number;
    dms: number;
    sqls: number;
    trend: number;
  };
}

// Mock data for performance trend
const performanceTrendData = [
  { week: "Week 1", dials: 72, answered: 18, dms: 11, sqls: 2 },
  { week: "Week 2", dials: 78, answered: 19, dms: 12, sqls: 3 },
  { week: "Week 3", dials: 85, answered: 20, dms: 13, sqls: 4 },
  { week: "Week 4", dials: 85, answered: 18, dms: 12, sqls: 3 },
];

// Mock data for client breakdown
const clientBreakdownData = [
  { client: "Inxpress", dials: 95, sqls: 4, conversionRate: "4.21%" },
  { client: "Congero", dials: 88, sqls: 3, conversionRate: "3.41%" },
  { client: "TechCorp Solutions", dials: 72, sqls: 3, conversionRate: "4.17%" },
  { client: "FinServe Group", dials: 65, sqls: 2, conversionRate: "3.08%" },
];

// Mock funnel data
const funnelData = [
  { stage: "Dials", count: 320, percentage: 100 },
  { stage: "Answered", count: 75, percentage: 23.4 },
  { stage: "DMs", count: 48, percentage: 15.0 },
  { stage: "MQLs", count: 18, percentage: 5.6 },
  { stage: "SQLs", count: 12, percentage: 3.75 },
];

export const SDRPerformanceOverview = ({ sdr }: SDRPerformanceOverviewProps) => {
  const answerRate = ((sdr.answered / sdr.dials) * 100).toFixed(1);
  const dmRate = ((sdr.dms / sdr.dials) * 100).toFixed(1);
  const conversionRate = ((sdr.sqls / sdr.dials) * 100).toFixed(2);

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Phone className="h-5 w-5 text-blue-600" />
              <div className="flex items-center gap-1 text-sm">
                {sdr.trend > 0 ? (
                  <>
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">+{sdr.trend}%</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                    <span className="text-red-600 font-medium">{sdr.trend}%</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{sdr.dials}</p>
            <p className="text-sm text-muted-foreground">Total Dials</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-600">{answerRate}%</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{sdr.answered}</p>
            <p className="text-sm text-muted-foreground">Answered</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Mail className="h-5 w-5 text-cyan-600" />
              <span className="text-sm font-medium text-cyan-600">{dmRate}%</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{sdr.dms}</p>
            <p className="text-sm text-muted-foreground">DMs Reached</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-600">{conversionRate}%</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{sdr.sqls}</p>
            <p className="text-sm text-muted-foreground">SQLs Generated</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trend (Last 4 Weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceTrendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="week" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="dials" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} name="Dials" />
              <Line type="monotone" dataKey="answered" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} name="Answered" />
              <Line type="monotone" dataKey="dms" stroke="#06B6D4" strokeWidth={2} dot={{ r: 4 }} name="DMs" />
              <Line type="monotone" dataKey="sqls" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} name="SQLs" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" />
              <YAxis type="category" dataKey="stage" className="text-xs" width={80} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number, name: string, props: any) => [
                  `${value} (${props.payload.percentage}%)`,
                  "Count"
                ]}
              />
              <Bar dataKey="count" fill="#8B5CF6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Client Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Client Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead className="text-right">Dials</TableHead>
                <TableHead className="text-right">SQLs</TableHead>
                <TableHead className="text-right">Conversion Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientBreakdownData.map((client) => (
                <TableRow key={client.client}>
                  <TableCell className="font-medium">{client.client}</TableCell>
                  <TableCell className="text-right">{client.dials}</TableCell>
                  <TableCell className="text-right font-bold">{client.sqls}</TableCell>
                  <TableCell className="text-right">{client.conversionRate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
};
