import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowUpRight, ArrowDownRight, Phone, PhoneCall, MessageSquare, Target, Percent } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format, differenceInDays } from "date-fns";
import type { DateRange } from "react-day-picker";

interface SDRPerformanceOverviewProps {
  sdr: {
    name: string;
    dials: number;
    answered: number;
    dms: number;
    sqls: number;
    trend: number;
    clientId?: string;
  };
  teamAverages?: {
    dials: number;
    answered: number;
    dms: number;
    sqls: number;
  };
  latestSQL?: { contact_person: string; company_name: string; booking_date: string } | null;
  dateRange?: DateRange;
  clientId?: string;
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
    <div className="flex justify-center py-4 overflow-visible">
      <svg width="100%" height={totalHeight} viewBox={`0 0 ${containerWidth} ${totalHeight}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
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
    <div className="mt-1">
      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
        <span>{label}</span>
        <span>·</span>
        {isAbove && <span className="text-emerald-500">↗</span>}
        {isBelow && <span className="text-red-500">↘</span>}
        {!isAbove && !isBelow && <span>→</span>}
      </p>
      <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
      <p className="text-[11px] text-muted-foreground">Team avg: {fmt(teamAvg)}</p>
    </div>
  );
};

export const SDRPerformanceOverview = ({ sdr, teamAverages, latestSQL, dateRange, clientId }: SDRPerformanceOverviewProps) => {
  const effectiveClientId = clientId || sdr.clientId || null;

  // KPI data from get_sdr_performance RPC
  const [kpi, setKpi] = useState({ dials: 0, answered: 0, dms: 0, sqls: 0, answerRate: 0, convRate: 0, avgTalkTime: 0 });
  // Trend data from get_sdr_weekly_trend RPC
  const [trendData, setTrendData] = useState<{ week_start: string; dials: number; answered: number; dm_conversations: number; sqls: number }[]>([]);
  // Client breakdown from get_sdr_client_breakdown RPC
  const [clientBreakdown, setClientBreakdown] = useState<{ client_id: string; client_name: string; dials: number; sqls: number; conv_rate: number }[]>([]);
  const [lastSQLDate, setLastSQLDate] = useState<string | null | undefined>(undefined);

  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : null;
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : null;

  // Fetch all data via RPCs
  useEffect(() => {
    if (!startDate || !endDate) return;
    const fetchAll = async () => {
      const params = {
        p_sdr_name: sdr.name,
        p_start_date: startDate + "T00:00:00+11:00",
        p_end_date: endDate + "T23:59:59+11:00",
        p_client_id: effectiveClientId,
      };

      const [perfRes, trendRes, breakdownRes] = await Promise.all([
        supabase.rpc("get_sdr_performance", params),
        supabase.rpc("get_sdr_weekly_trend", params),
        supabase.rpc("get_sdr_client_breakdown", {
          p_sdr_name: sdr.name,
          p_start_date: startDate + "T00:00:00+11:00",
          p_end_date: endDate + "T23:59:59+11:00",
        }),
      ]);

      if (perfRes.data && perfRes.data.length > 0) {
        const r = perfRes.data[0];
        setKpi({
          dials: Number(r.total_dials) || 0,
          answered: Number(r.answered) || 0,
          dms: Number(r.dm_conversations) || 0,
          sqls: Number(r.sqls) || 0,
          answerRate: Number(r.answer_rate) || 0,
          convRate: Number(r.conv_rate) || 0,
          avgTalkTime: Number(r.avg_talk_time_seconds) || 0,
        });
      } else {
        setKpi({ dials: 0, answered: 0, dms: 0, sqls: 0, answerRate: 0, convRate: 0, avgTalkTime: 0 });
      }

      if (trendRes.data) {
        setTrendData(trendRes.data as any[]);
      } else {
        setTrendData([]);
      }

      if (breakdownRes.data) {
        setClientBreakdown(breakdownRes.data as any[]);
      } else {
        setClientBreakdown([]);
      }
    };
    fetchAll();
  }, [sdr.name, startDate, endDate, effectiveClientId]);

  // Fetch last SQL date for this SDR (global, not filtered by period)
  useEffect(() => {
    const fetchLastSQL = async () => {
      let query = supabase
        .from("sql_meetings")
        .select("booking_date")
        .eq("sdr_name", sdr.name)
        .not("meeting_status", "eq", "cancelled");
      if (effectiveClientId) query = query.eq("client_id", effectiveClientId);
      const { data } = await query
        .order("booking_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      setLastSQLDate(data?.booking_date ?? null);
    };
    fetchLastSQL();
  }, [sdr.name, effectiveClientId]);

  // Determine daily vs weekly view
  const isShortRange = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return false;
    const days = differenceInDays(dateRange.to, dateRange.from);
    return days <= 7 || trendData.length <= 1;
  }, [dateRange, trendData]);

  // Build performance trend chart data
  const performanceTrendData = useMemo(() => {
    if (trendData.length === 0) return [];
    return trendData.map((w) => ({
      week: format(new Date(w.week_start + "T00:00:00"), isShortRange ? "EEE, MMM d" : "MMM dd"),
      dials: Number(w.dials) || 0,
      answered: Number(w.answered) || 0,
      dms: Number(w.dm_conversations) || 0,
      sqls: Number(w.sqls) || 0,
    }));
  }, [trendData, isShortRange]);

  const funnelLevels = useMemo(() => {
    const pct = (num: number, den: number) => den > 0 ? ((num / den) * 100).toFixed(1) + "%" : "0.0%";
    return [
      { label: "Dials", count: kpi.dials, color: METRIC_COLORS.dials, pctOfPrev: "100%" },
      { label: "Answered", count: kpi.answered, color: METRIC_COLORS.answered, pctOfPrev: pct(kpi.answered, kpi.dials) },
      { label: "DM Conversations", count: kpi.dms, color: METRIC_COLORS.dms, pctOfPrev: pct(kpi.dms, kpi.answered) },
      { label: "SQLs", count: kpi.sqls, color: METRIC_COLORS.sqls, pctOfPrev: pct(kpi.sqls, kpi.dms) },
    ];
  }, [kpi]);

  const ta = teamAverages;
  const answerRate = kpi.answerRate.toFixed(1);
  const teamAnswerRate = ta && ta.dials > 0 ? (ta.answered / ta.dials) * 100 : 0;

  // Days since last SQL
  const daysSinceLastSQL = useMemo(() => {
    if (lastSQLDate === undefined) return undefined;
    if (lastSQLDate === null) return null;
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

      {/* Latest SQL Banner */}
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
            <CardTitle>Performance Trend ({trendData.length <= 1 ? "Daily" : "Weekly"})</CardTitle>
          </CardHeader>
          <CardContent>
            {performanceTrendData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">No data for this period</div>
            ) : (
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
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg overflow-visible">
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent className="overflow-visible pb-6">
            <ConversionFunnel levels={funnelLevels} />
          </CardContent>
        </Card>
      </div>

      {clientBreakdown.length > 1 && (
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
                {clientBreakdown.map((row) => (
                  <TableRow key={row.client_id}>
                    <TableCell className="font-medium text-left">{row.client_name || row.client_id}</TableCell>
                    <TableCell className="text-center">{Number(row.dials).toLocaleString()}</TableCell>
                    <TableCell className="text-center">{Number(row.sqls)}</TableCell>
                    <TableCell className="text-center">{Number(row.conv_rate).toFixed(2)}%</TableCell>
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
