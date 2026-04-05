import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowUpRight, ArrowDownRight, Phone, PhoneCall, MessageSquare, Target, Percent } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { startOfWeek, format, isWithinInterval, differenceInDays, eachDayOfInterval } from "date-fns";
import type { DateRange } from "react-day-picker";

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
  latestSQL?: { contact_person: string; company_name: string; booking_date: string } | null;
  dateRange?: DateRange;
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
      <svg width="100%" height={totalHeight} viewBox={`0 0 ${containerWidth} ${totalHeight}`} preserveAspectRatio="xMidYMid meet">
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

interface TeamAvgInlineProps {
  label: string;
  value: number;
  teamAvg: number;
  formatter?: (v: number) => string;
}

const TeamAvgInline = ({ label, value, teamAvg, formatter }: TeamAvgInlineProps) => {
  const fmt = formatter || ((v: number) => v.toLocaleString());
  const isAbove = value > teamAvg;
  const isBelow = value < teamAvg;

  return (
    <p className="text-[11px] text-muted-foreground flex items-center gap-1 flex-wrap">
      <span>{label}</span>
      <span>·</span>
      {isAbove && <span className="text-emerald-500">↗</span>}
      {isBelow && <span className="text-red-500">↘</span>}
      {!isAbove && !isBelow && <span>→</span>}
      <span>Team avg: {fmt(teamAvg)}</span>
    </p>
  );
};

export const SDRPerformanceOverview = ({ sdr, teamAverages, latestSQL, dateRange }: SDRPerformanceOverviewProps) => {
  const [allSnapshots, setAllSnapshots] = useState<Snapshot[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [lastSQLDate, setLastSQLDate] = useState<string | null | undefined>(undefined);

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
      if (snaps) setAllSnapshots(snaps);
      if (clients) {
        const map: Record<string, string> = {};
        for (const c of clients) map[c.client_id] = c.client_name;
        setClientNames(map);
      }
    };
    fetchData();
  }, [sdr.name]);

  // Fetch last SQL date for this SDR
  useEffect(() => {
    const fetchLastSQL = async () => {
      const { data } = await supabase
        .from("sql_meetings")
        .select("booking_date")
        .eq("sdr_name", sdr.name)
        .not("meeting_status", "eq", "cancelled")
        .order("booking_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      setLastSQLDate(data?.booking_date ?? null);
    };
    fetchLastSQL();
  }, [sdr.name]);

  // Filter snapshots by date range
  const snapshots = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return allSnapshots;
    return allSnapshots.filter((s) => {
      const d = new Date(s.snapshot_date + "T00:00:00");
      return isWithinInterval(d, { start: dateRange.from!, end: dateRange.to! });
    });
  }, [allSnapshots, dateRange]);

  // Compute KPI totals from filtered snapshots
  const filteredKPIs = useMemo(() => {
    return snapshots.reduce(
      (acc, s) => {
        acc.dials += s.dials || 0;
        acc.answered += s.answered || 0;
        acc.dms += s.dms_reached || 0;
        acc.sqls += s.sqls || 0;
        return acc;
      },
      { dials: 0, answered: 0, dms: 0, sqls: 0 }
    );
  }, [snapshots]);

  // Determine if we should show daily vs weekly trend
  // Use daily view when range is short OR when only 1 week of weekly data exists
  const weekCount = useMemo(() => {
    const weekMap = new Set<string>();
    snapshots.forEach((s) => {
      const ws = startOfWeek(new Date(s.snapshot_date + "T00:00:00"), { weekStartsOn: 1 });
      weekMap.add(format(ws, "yyyy-MM-dd"));
    });
    return weekMap.size;
  }, [snapshots]);

  const isShortRange = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return false;
    return differenceInDays(dateRange.to, dateRange.from) <= 7 || weekCount <= 1;
  }, [dateRange, weekCount]);

  const performanceTrendData = useMemo(() => {
    if (isShortRange && dateRange?.from && dateRange?.to) {
      // Daily data points — cap at today, skip weekends
      const endDate = dateRange.to > new Date() ? new Date() : dateRange.to;
      const days = eachDayOfInterval({ start: dateRange.from, end: endDate })
        .filter(d => d.getDay() !== 0 && d.getDay() !== 6); // Mon-Fri only
      return days.map(day => {
        const key = format(day, "yyyy-MM-dd");
        const daySnapshots = snapshots.filter(s => s.snapshot_date === key);
        return {
          week: format(day, "EEE, MMM d"),
          dials: daySnapshots.reduce((sum, s) => sum + (s.dials || 0), 0),
          answered: daySnapshots.reduce((sum, s) => sum + (s.answered || 0), 0),
          dms: daySnapshots.reduce((sum, s) => sum + (s.dms_reached || 0), 0),
          sqls: daySnapshots.reduce((sum, s) => sum + (s.sqls || 0), 0),
        };
      });
    }
    // Weekly aggregation
    const weekMap = new Map<string, { dials: number; answered: number; dms: number; sqls: number; sortKey: string }>();
    snapshots.forEach((s) => {
      const ws = startOfWeek(new Date(s.snapshot_date + "T00:00:00"), { weekStartsOn: 1 });
      const weekLabel = format(ws, "MMM dd");
      const sortKey = format(ws, "yyyy-MM-dd");
      const entry = weekMap.get(weekLabel) || { dials: 0, answered: 0, dms: 0, sqls: 0, sortKey };
      entry.dials += s.dials || 0;
      entry.answered += s.answered || 0;
      entry.dms += s.dms_reached || 0;
      entry.sqls += s.sqls || 0;
      weekMap.set(weekLabel, entry);
    });
    return Array.from(weekMap.entries())
      .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
      .map(([week, data]) => ({ week, dials: data.dials, answered: data.answered, dms: data.dms, sqls: data.sqls }));
  }, [snapshots, isShortRange, dateRange]);

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
    const totals = filteredKPIs;
    const pct = (num: number, den: number) => den > 0 ? ((num / den) * 100).toFixed(1) + "%" : "0.0%";
    return [
      { label: "Dials", count: totals.dials, color: METRIC_COLORS.dials, pctOfPrev: "100%" },
      { label: "Answered", count: totals.answered, color: METRIC_COLORS.answered, pctOfPrev: pct(totals.answered, totals.dials) },
      { label: "DM Conversations", count: totals.dms, color: METRIC_COLORS.dms, pctOfPrev: pct(totals.dms, totals.answered) },
      { label: "SQLs", count: totals.sqls, color: METRIC_COLORS.sqls, pctOfPrev: pct(totals.sqls, totals.dms) },
    ];
  }, [filteredKPIs]);

  const ta = teamAverages;
  const kpi = filteredKPIs;
  const answerRate = kpi.dials > 0 ? ((kpi.answered / kpi.dials) * 100).toFixed(1) : "0.0";
  const teamAnswerRate = ta && ta.dials > 0 ? (ta.answered / ta.dials) * 100 : 0;

  // Days since last SQL
  const daysSinceLastSQL = useMemo(() => {
    if (lastSQLDate === undefined) return undefined; // loading
    if (lastSQLDate === null) return null; // never
    return differenceInDays(new Date(), new Date(lastSQLDate));
  }, [lastSQLDate]);

  return (
    <>
      {/* KPI Cards — plain white, Activity Monitor style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-sm rounded-lg bg-white dark:bg-card border border-[#E2E8F0] dark:border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-3xl font-bold text-[#0f172a] dark:text-[#f1f5f9]">{kpi.dials.toLocaleString()}</p>
                {ta ? (
                  <TeamAvgInline label="Total Dials" value={kpi.dials} teamAvg={ta.dials} />
                ) : (
                  <p className="text-[13px] text-muted-foreground">Total Dials</p>
                )}
              </div>
              <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                <Phone className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg bg-white dark:bg-card border border-[#E2E8F0] dark:border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-3xl font-bold text-[#0f172a] dark:text-[#f1f5f9]">{kpi.answered.toLocaleString()}</p>
                {ta ? (
                  <TeamAvgInline label="Answered" value={kpi.answered} teamAvg={ta.answered} />
                ) : (
                  <p className="text-[13px] text-muted-foreground">Answered</p>
                )}
              </div>
              <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                <PhoneCall className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Answer Rate card */}
        <Card className="shadow-sm rounded-lg bg-white dark:bg-card border border-[#E2E8F0] dark:border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-3xl font-bold text-[#0f172a] dark:text-[#f1f5f9]">{answerRate}%</p>
                {ta ? (
                  <TeamAvgInline label="Answer Rate" value={parseFloat(answerRate)} teamAvg={teamAnswerRate} formatter={(v) => v.toFixed(1) + "%"} />
                ) : (
                  <p className="text-[13px] text-muted-foreground">Answer Rate</p>
                )}
              </div>
              <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                <Percent className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg bg-white dark:bg-card border border-[#E2E8F0] dark:border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-3xl font-bold text-[#0f172a] dark:text-[#f1f5f9]">{kpi.dms.toLocaleString()}</p>
                {ta ? (
                  <TeamAvgInline label="DM Conversations" value={kpi.dms} teamAvg={ta.dms} />
                ) : (
                  <p className="text-[13px] text-muted-foreground">DM Conversations</p>
                )}
              </div>
              <div className="h-9 w-9 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center shrink-0">
                <MessageSquare className="h-5 w-5" style={{ color: "#14B8A6" }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg bg-white dark:bg-card border border-[#E2E8F0] dark:border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-3xl font-bold text-[#0f172a] dark:text-[#f1f5f9]">{kpi.sqls.toLocaleString()}</p>
                {ta ? (
                  <TeamAvgInline label="SQLs Generated" value={kpi.sqls} teamAvg={ta.sqls} />
                ) : (
                  <p className="text-[13px] text-muted-foreground">SQLs Generated</p>
                )}
                {kpi.sqls === 0 && daysSinceLastSQL !== undefined && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {daysSinceLastSQL === null ? "No SQLs booked yet" : `Last SQL: ${daysSinceLastSQL}d ago`}
                  </p>
                )}
              </div>
              <div className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center shrink-0">
                <Target className="h-5 w-5" style={{ color: "#F43F5E" }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latest SQL Banner — below KPI cards */}
      {latestSQL ? (
        <div className="bg-white dark:bg-card border border-[#E2E8F0] dark:border-border rounded-lg px-4 py-2.5 text-[13px]">
          <span className="font-bold">🎯 Latest SQL</span>
          <span className="text-muted-foreground"> · </span>
          <span>{latestSQL.contact_person}</span>
          {latestSQL.company_name && (
            <>
              <span className="text-muted-foreground"> at </span>
              <span>{latestSQL.company_name}</span>
            </>
          )}
          <span className="text-muted-foreground"> · </span>
          <span>{format(new Date(latestSQL.booking_date + "T00:00:00"), "d MMM yyyy")}</span>
        </div>
      ) : (
        <div className="bg-white dark:bg-card border border-[#E2E8F0] dark:border-border rounded-lg px-4 py-2.5 text-[13px]">
          <span className="font-bold">🎯</span>
          <span className="text-muted-foreground"> Waiting for {sdr.name}'s first SQL this period...</span>
        </div>
      )}

      {/* Side by side: Performance Trend + Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle>Performance Trend ({isShortRange ? "Daily" : "Weekly"})</CardTitle>
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
                  <TableHead className="text-center">Dials</TableHead>
                  <TableHead className="text-center">SQLs</TableHead>
                  <TableHead className="text-center">Conversion Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="table-striped">
                {clientBreakdownData.map((client) => (
                  <TableRow key={client.client}>
                    <TableCell className="font-medium text-left">{client.clientName}</TableCell>
                    <TableCell className="text-center">{client.dials.toLocaleString()}</TableCell>
                    <TableCell className="text-center">{client.sqls}</TableCell>
                    <TableCell className="text-center">{client.conversionRate}</TableCell>
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
