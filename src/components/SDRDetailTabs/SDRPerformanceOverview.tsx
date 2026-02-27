import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowUpRight, ArrowDownRight, Phone, CheckCircle, Mail, Target } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { startOfWeek, format } from "date-fns";

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

interface Snapshot {
  snapshot_date: string;
  client_id: string | null;
  dials: number | null;
  answered: number | null;
  dms_reached: number | null;
  mqls: number | null;
  sqls: number | null;
}

export const SDRPerformanceOverview = ({ sdr }: SDRPerformanceOverviewProps) => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("daily_snapshots")
        .select("snapshot_date, client_id, dials, answered, dms_reached, mqls, sqls")
        .eq("sdr_name", sdr.name)
        .order("snapshot_date", { ascending: true });
      if (data) setSnapshots(data);
    };
    fetch();
  }, [sdr.name]);

  // Performance Trend: group by week
  const performanceTrendData = useMemo(() => {
    const weekMap = new Map<string, { dials: number; answered: number; dms: number; sqls: number }>();
    snapshots.forEach((s) => {
      const weekStart = format(startOfWeek(new Date(s.snapshot_date), { weekStartsOn: 1 }), "MMM dd");
      const entry = weekMap.get(weekStart) || { dials: 0, answered: 0, dms: 0, sqls: 0 };
      entry.dials += s.dials || 0;
      entry.answered += s.answered || 0;
      entry.dms += s.dms_reached || 0;
      entry.sqls += s.sqls || 0;
      weekMap.set(weekStart, entry);
    });
    return Array.from(weekMap.entries()).map(([week, data]) => ({ week, ...data }));
  }, [snapshots]);

  // Client Breakdown: group by client_id
  const clientBreakdownData = useMemo(() => {
    const clientMap = new Map<string, { dials: number; sqls: number }>();
    snapshots.forEach((s) => {
      const cid = s.client_id || "Unknown";
      const entry = clientMap.get(cid) || { dials: 0, sqls: 0 };
      entry.dials += s.dials || 0;
      entry.sqls += s.sqls || 0;
      clientMap.set(cid, entry);
    });
    return Array.from(clientMap.entries()).map(([client, data]) => ({
      client,
      dials: data.dials,
      sqls: data.sqls,
      conversionRate: data.dials > 0 ? ((data.sqls / data.dials) * 100).toFixed(2) + "%" : "0%",
    }));
  }, [snapshots]);

  // Conversion Funnel
  const funnelData = useMemo(() => {
    const totals = snapshots.reduce(
      (acc, s) => {
        acc.dials += s.dials || 0;
        acc.answered += s.answered || 0;
        acc.dms += s.dms_reached || 0;
        acc.mqls += s.mqls || 0;
        acc.sqls += s.sqls || 0;
        return acc;
      },
      { dials: 0, answered: 0, dms: 0, mqls: 0, sqls: 0 }
    );
    const pct = (v: number) => (totals.dials > 0 ? parseFloat(((v / totals.dials) * 100).toFixed(1)) : 0);
    return [
      { stage: "Dials", count: totals.dials, percentage: 100 },
      { stage: "Answered", count: totals.answered, percentage: pct(totals.answered) },
      { stage: "DM Conversations", count: totals.dms, percentage: pct(totals.dms) },
      { stage: "SQLs", count: totals.sqls, percentage: pct(totals.sqls) },
    ];
  }, [snapshots]);

  const answerRate = sdr.dials > 0 ? ((sdr.answered / sdr.dials) * 100).toFixed(1) : "0";
  const dmRate = sdr.dials > 0 ? ((sdr.dms / sdr.dials) * 100).toFixed(1) : "0";
  const conversionRate = sdr.dials > 0 ? ((sdr.sqls / sdr.dials) * 100).toFixed(2) : "0";

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
            <p className="text-sm text-muted-foreground">DM Conversations</p>
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Performance Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Trend (Weekly)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
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
            </div>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Client Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
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
