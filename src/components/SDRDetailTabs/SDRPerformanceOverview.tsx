import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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
  teamAverages?: {
    dials: number;
    answered: number;
    dms: number;
    sqls: number;
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

const METRIC_COLORS = {
  dials: "#F59E0B",
  answered: "#10B981",
  dms: "#14B8A6",
  sqls: "#F43F5E",
};

// SVG Trapezoid Funnel
const ConversionFunnel = ({ levels }: { levels: { label: string; count: number; color: string; pctOfPrev: string }[] }) => {
  const containerWidth = 480;
  const levelHeight = 56;
  const gap = 4;
  const totalHeight = levels.length * levelHeight + (levels.length - 1) * gap;

  return (
    <div className="flex justify-center py-4">
      <svg width={containerWidth} height={totalHeight} viewBox={`0 0 ${containerWidth} ${totalHeight}`}>
        {levels.map((level, i) => {
          const widthPct = 1 - i * (0.6 / (levels.length - 1 || 1));
          const nextWidthPct = i < levels.length - 1 ? 1 - (i + 1) * (0.6 / (levels.length - 1 || 1)) : widthPct * 0.7;
          const topWidth = containerWidth * widthPct;
          const bottomWidth = i < levels.length - 1 ? containerWidth * nextWidthPct : containerWidth * (widthPct * 0.7);
          const y = i * (levelHeight + gap);
          const topLeft = (containerWidth - topWidth) / 2;
          const topRight = topLeft + topWidth;
          const bottomLeft = (containerWidth - bottomWidth) / 2;
          const bottomRight = bottomLeft + bottomWidth;

          const points = `${topLeft},${y} ${topRight},${y} ${bottomRight},${y + levelHeight} ${bottomLeft},${y + levelHeight}`;

          return (
            <g key={level.label}>
              <polygon points={points} fill={level.color} opacity={0.85} rx={4} />
              <text x={topLeft - 8} y={y + levelHeight / 2 + 1} textAnchor="end" fill="hsl(var(--foreground))" fontSize={12} fontWeight={500} dominantBaseline="middle">{level.label}</text>
              <text x={containerWidth / 2} y={y + levelHeight / 2 + 1} textAnchor="middle" fill="white" fontSize={16} fontWeight={700} dominantBaseline="middle">{level.count.toLocaleString()}</text>
              <text x={topRight + 8} y={y + levelHeight / 2 + 1} textAnchor="start" fill="hsl(var(--muted-foreground))" fontSize={12} dominantBaseline="middle">{level.pctOfPrev}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const TeamAvgLine = ({ value, teamAvg, formatter }: { value: number; teamAvg: number; formatter?: (v: number) => string }) => {
  const fmt = formatter || ((v: number) => v.toLocaleString());
  if (teamAvg === 0 && value === 0) return null;
  const isAbove = value > teamAvg;
  const isBelow = value < teamAvg;

  return (
    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
      {isAbove && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
      {isBelow && <ArrowDownRight className="h-3 w-3 text-red-500" />}
      Team avg: {fmt(teamAvg)}
    </p>
  );
};

export const SDRPerformanceOverview = ({ sdr, teamAverages }: SDRPerformanceOverviewProps) => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: snaps }, { data: clients }] = await Promise.all([
        supabase
          .from("daily_snapshots")
          .select("snapshot_date, client_id, dials, answered, dms_reached, mqls, sqls")
          .eq("sdr_name", sdr.name)
          .order("snapshot_date", { ascending: true }),
        supabase.from("clients").select("client_id, client_name"),
      ]);
      if (snaps) setSnapshots(snaps);
      if (clients) {
        const map: Record<string, string> = {};
        for (const c of clients) map[c.client_id] = c.client_name;
        setClientNames(map);
      }
    };
    fetchData();
  }, [sdr.name]);

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
      clientName: clientNames[client] || client,
      dials: data.dials,
      sqls: data.sqls,
      conversionRate: data.dials > 0 ? ((data.sqls / data.dials) * 100).toFixed(2) + "%" : "0%",
    }));
  }, [snapshots, clientNames]);

  const funnelLevels = useMemo(() => {
    const totals = snapshots.reduce(
      (acc, s) => {
        acc.dials += s.dials || 0;
        acc.answered += s.answered || 0;
        acc.dms += s.dms_reached || 0;
        acc.sqls += s.sqls || 0;
        return acc;
      },
      { dials: 0, answered: 0, dms: 0, sqls: 0 }
    );
    const pct = (num: number, den: number) => den > 0 ? ((num / den) * 100).toFixed(1) + "%" : "0.0%";
    const hasDMs = totals.dms > 0;
    if (hasDMs) {
      return [
        { label: "Dials", count: totals.dials, color: METRIC_COLORS.dials, pctOfPrev: "100%" },
        { label: "Answered", count: totals.answered, color: METRIC_COLORS.answered, pctOfPrev: pct(totals.answered, totals.dials) },
        { label: "DM Conversations", count: totals.dms, color: METRIC_COLORS.dms, pctOfPrev: pct(totals.dms, totals.answered) },
        { label: "SQLs", count: totals.sqls, color: METRIC_COLORS.sqls, pctOfPrev: pct(totals.sqls, totals.dms) },
      ];
    }
    return [
      { label: "Dials", count: totals.dials, color: METRIC_COLORS.dials, pctOfPrev: "100%" },
      { label: "Answered", count: totals.answered, color: METRIC_COLORS.answered, pctOfPrev: pct(totals.answered, totals.dials) },
      { label: "SQLs", count: totals.sqls, color: METRIC_COLORS.sqls, pctOfPrev: pct(totals.sqls, totals.answered) },
    ];
  }, [snapshots]);

  const answerRate = sdr.dials > 0 ? ((sdr.answered / sdr.dials) * 100).toFixed(1) : "0";
  const dmRate = sdr.dials > 0 ? ((sdr.dms / sdr.dials) * 100).toFixed(1) : "0";
  const conversionRate = sdr.dials > 0 ? ((sdr.sqls / sdr.dials) * 100).toFixed(2) : "0";

  const ta = teamAverages;

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm rounded-lg" style={{ backgroundColor: "#FFFBEB" }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Phone className="h-5 w-5 text-amber-600" />
              <div className="flex items-center gap-1">
                {sdr.trend > 0 ? (
                  <>
                    <ArrowUpRight className="h-3 w-3 text-green-600" />
                    <span className="text-[12px] text-green-600 font-medium">+{sdr.trend}%</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-3 w-3 text-red-600" />
                    <span className="text-[12px] text-red-600 font-medium">{sdr.trend}%</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{sdr.dials.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Dials</p>
            {ta && <TeamAvgLine value={sdr.dials} teamAvg={ta.dials} />}
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg" style={{ backgroundColor: "#ECFDF5" }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <span className="text-[12px] font-medium text-emerald-600">{answerRate}%</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{sdr.answered.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Answered</p>
            {ta && <TeamAvgLine value={sdr.answered} teamAvg={ta.answered} />}
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg" style={{ backgroundColor: "#F0FDFA" }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Mail className="h-5 w-5" style={{ color: "#14B8A6" }} />
              <span className="text-[12px] font-medium" style={{ color: "#14B8A6" }}>{dmRate}%</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{sdr.dms}</p>
            <p className="text-sm text-muted-foreground">DM Conversations</p>
            {ta && <TeamAvgLine value={sdr.dms} teamAvg={ta.dms} />}
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg" style={{ backgroundColor: "#FFF1F2" }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-5 w-5" style={{ color: "#F43F5E" }} />
              <span className="text-[12px] font-medium" style={{ color: "#F43F5E" }}>{conversionRate}%</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{sdr.sqls}</p>
            <p className="text-sm text-muted-foreground">SQLs Generated</p>
            {ta && <TeamAvgLine value={sdr.sqls} teamAvg={ta.sqls} />}
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle>Performance Trend (Weekly)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="week" className="text-xs" tickLine={false} />
                  <YAxis className="text-xs" tickLine={false} domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="dials" stroke={METRIC_COLORS.dials} strokeWidth={2} dot={{ r: 3, fill: METRIC_COLORS.dials }} activeDot={{ r: 6 }} name="Dials" />
                  <Line type="monotone" dataKey="answered" stroke={METRIC_COLORS.answered} strokeWidth={2} dot={{ r: 3, fill: METRIC_COLORS.answered }} activeDot={{ r: 6 }} name="Answered" />
                  <Line type="monotone" dataKey="dms" stroke={METRIC_COLORS.dms} strokeWidth={2} dot={{ r: 3, fill: METRIC_COLORS.dms }} activeDot={{ r: 6 }} name="DMs" />
                  <Line type="monotone" dataKey="sqls" stroke={METRIC_COLORS.sqls} strokeWidth={2} dot={{ r: 3, fill: METRIC_COLORS.sqls }} activeDot={{ r: 6 }} name="SQLs" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionFunnel levels={funnelLevels} />
          </CardContent>
        </Card>
      </div>

      {clientBreakdownData.length > 1 && (
        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle>Client Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="table-header-navy">
                <TableRow>
                  <TableHead className="text-left">Client</TableHead>
                  <TableHead className="text-right">Dials</TableHead>
                  <TableHead className="text-right">SQLs</TableHead>
                  <TableHead className="text-right">Conversion Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="table-striped">
                {clientBreakdownData.map((client) => (
                  <TableRow key={client.client}>
                    <TableCell className="font-medium text-left">{client.clientName}</TableCell>
                    <TableCell className="text-right">{client.dials.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold">{client.sqls}</TableCell>
                    <TableCell className="text-right">{client.conversionRate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
};
