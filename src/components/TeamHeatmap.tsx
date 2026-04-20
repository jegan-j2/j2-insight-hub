import { useEffect, useMemo, useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { CalendarIcon, Loader2, Phone, CheckCircle2, Target, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";

type Mode = "hour" | "day" | "week" | "month";
type RangePreset = "last7days" | "last30days" | "thisMonth" | "lastMonth";

interface ClientLite {
  client_id: string;
  client_name: string;
  logo_url: string | null;
}

interface HeatmapRow {
  sdr_name: string;
  period_key: string;
  dials: number;
  answered: number;
  dms: number;
  sqls: number;
}

// 6-tier intensity colours from the spec
const INTENSITY_COLORS = ["#0f172a", "#1e3a5f", "#1e40af", "#2563eb", "#1d4ed8", "#1e3a8a"];

const intensityLevel = (value: number, max: number): number => {
  if (value <= 0 || max <= 0) return 0;
  const ratio = value / max;
  if (ratio <= 0.2) return 1;
  if (ratio <= 0.4) return 2;
  if (ratio <= 0.6) return 3;
  if (ratio <= 0.8) return 4;
  return 5;
};

const melbourneToday = (): Date => toZonedTime(new Date(), "Australia/Melbourne");

interface Props {
  clients: ClientLite[];
}

export const TeamHeatmap = ({ clients }: Props) => {
  const [mode, setMode] = useState<Mode>("hour");
  const [hourDate, setHourDate] = useState<Date>(() => melbourneToday());
  const [hourPopoverOpen, setHourPopoverOpen] = useState(false);
  const [rangePreset, setRangePreset] = useState<RangePreset>("last7days");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [data, setData] = useState<HeatmapRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  // Compute date range based on mode + preset
  const { startDate, endDate } = useMemo(() => {
    if (mode === "hour") {
      const d = format(hourDate, "yyyy-MM-dd");
      return { startDate: d, endDate: d };
    }
    const today = melbourneToday();
    switch (rangePreset) {
      case "last7days":
        return { startDate: format(subDays(today, 6), "yyyy-MM-dd"), endDate: format(today, "yyyy-MM-dd") };
      case "last30days":
        return { startDate: format(subDays(today, 29), "yyyy-MM-dd"), endDate: format(today, "yyyy-MM-dd") };
      case "thisMonth":
        return { startDate: format(startOfMonth(today), "yyyy-MM-dd"), endDate: format(endOfMonth(today), "yyyy-MM-dd") };
      case "lastMonth": {
        const lm = subMonths(today, 1);
        return { startDate: format(startOfMonth(lm), "yyyy-MM-dd"), endDate: format(endOfMonth(lm), "yyyy-MM-dd") };
      }
    }
  }, [mode, hourDate, rangePreset]);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: rows, error } = await supabase.rpc("get_team_heatmap", {
          p_mode: mode,
          p_start_date: startDate,
          p_end_date: endDate,
          p_client_id: clientFilter === "all" ? null : clientFilter,
        });
        if (cancelled) return;
        if (error) {
          console.error("get_team_heatmap error", error);
          setData([]);
        } else {
          setData((rows || []) as HeatmapRow[]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [mode, startDate, endDate, clientFilter]);

  // Reset selected period when filters change
  useEffect(() => { setSelectedPeriod(null); }, [mode, startDate, endDate, clientFilter]);

  // Build SDR list, period column list, and lookup map
  const { sdrs, periods, cellMap } = useMemo(() => {
    const sdrSet = new Set<string>();
    const periodSet = new Set<string>();
    const map = new Map<string, HeatmapRow>();
    for (const row of data) {
      if (!row.sdr_name) continue;
      sdrSet.add(row.sdr_name);
      periodSet.add(row.period_key);
      map.set(`${row.sdr_name}|${row.period_key}`, row);
    }
    let periodList = Array.from(periodSet);

    if (mode === "hour") {
      // Always show 09–18; merge any extra hours
      const baseHours: string[] = [];
      for (let h = 9; h <= 18; h++) baseHours.push(String(h).padStart(2, "0"));
      const merged = new Set<string>(baseHours);
      for (const p of periodList) merged.add(p);
      periodList = Array.from(merged).sort();
    } else {
      periodList.sort();
    }

    return {
      sdrs: Array.from(sdrSet).sort((a, b) => a.localeCompare(b)),
      periods: periodList,
      cellMap: map,
    };
  }, [data, mode]);

  // Per-SDR max for intensity calc
  const sdrMaxMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of data) {
      const cur = m.get(row.sdr_name) || 0;
      if (row.dials > cur) m.set(row.sdr_name, row.dials);
    }
    return m;
  }, [data]);

  // Column totals (team)
  const columnTotals = useMemo(() => {
    const m = new Map<string, { dials: number; answered: number; dms: number; sqls: number }>();
    for (const p of periods) m.set(p, { dials: 0, answered: 0, dms: 0, sqls: 0 });
    for (const row of data) {
      const t = m.get(row.period_key);
      if (!t) continue;
      t.dials += row.dials || 0;
      t.answered += row.answered || 0;
      t.dms += row.dms || 0;
      t.sqls += row.sqls || 0;
    }
    return m;
  }, [data, periods]);

  // Format header label
  const formatPeriodLabel = (key: string): string => {
    if (mode === "hour") {
      const h = parseInt(key, 10);
      if (Number.isNaN(h)) return key;
      const ampm = h >= 12 ? "PM" : "AM";
      const display = h % 12 === 0 ? 12 : h % 12;
      return `${display}${ampm}`;
    }
    if (mode === "day") {
      const d = new Date(key + "T00:00:00");
      return format(d, "MMM d");
    }
    if (mode === "week") {
      const d = new Date(key + "T00:00:00");
      return `Wk ${format(d, "MMM d")}`;
    }
    if (mode === "month") {
      const d = new Date(key + "-01T00:00:00");
      return format(d, "MMM yyyy");
    }
    return key;
  };

  // Summary bar values
  const summary = useMemo(() => {
    const filterRows = selectedPeriod
      ? data.filter(r => r.period_key === selectedPeriod)
      : data;
    let dials = 0, answered = 0, sqls = 0;
    const sdrSet = new Set<string>();
    for (const r of filterRows) {
      dials += r.dials || 0;
      answered += r.answered || 0;
      sqls += r.sqls || 0;
      if ((r.dials || 0) > 0) sdrSet.add(r.sdr_name);
    }
    // Peak period (always vs full data, not selected)
    let peakKey: string | null = null;
    let peakValue = 0;
    for (const [k, v] of columnTotals.entries()) {
      if (v.dials > peakValue) { peakValue = v.dials; peakKey = k; }
    }
    const answerRate = dials > 0 ? ((answered / dials) * 100).toFixed(1) : "0.0";
    const convRate = dials > 0 ? ((sqls / dials) * 100).toFixed(2) : "0.00";
    return {
      dials, answered, sqls,
      activeSdrs: sdrSet.size,
      answerRate, convRate,
      peakLabel: peakKey ? formatPeriodLabel(peakKey) : "—",
      peakValue,
    };
  }, [data, selectedPeriod, columnTotals]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chart data
  const chartData = useMemo(() => {
    return periods.map(p => {
      const t = columnTotals.get(p) || { dials: 0, answered: 0, dms: 0, sqls: 0 };
      return { period: p, label: formatPeriodLabel(p), dials: t.dials, sqls: t.sqls };
    });
  }, [periods, columnTotals]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalDialsAll = useMemo(() => chartData.reduce((s, r) => s + r.dials, 0), [chartData]);
  const paceTarget = useMemo(() => {
    const activePeriods = chartData.filter(r => r.dials > 0).length;
    if (activePeriods === 0) return 0;
    return Math.round(totalDialsAll / activePeriods);
  }, [chartData, totalDialsAll]);

  const peakLabel = mode === "hour" ? "Peak Hour" : mode === "day" ? "Peak Day" : mode === "week" ? "Peak Week" : "Peak Month";

  return (
    <div className="space-y-6">
      {/* Mode switcher + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center rounded-lg border border-border bg-card p-1">
          {(["hour", "day", "week", "month"] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize min-h-[36px]",
                mode === m
                  ? "bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mode === "hour" ? (
            <Popover open={hourPopoverOpen} onOpenChange={setHourPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-h-[40px] gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(hourDate, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[100]" align="start">
                <Calendar
                  mode="single"
                  selected={hourDate}
                  onSelect={(d) => { if (d) { setHourDate(d); setHourPopoverOpen(false); } }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          ) : (
            <div className="flex flex-wrap items-center gap-1">
              {([
                { k: "last7days", l: "Last 7 Days" },
                { k: "last30days", l: "Last 30 Days" },
                { k: "thisMonth", l: "This Month" },
                { k: "lastMonth", l: "Last Month" },
              ] as { k: RangePreset; l: string }[]).map(p => (
                <Button
                  key={p.k}
                  variant={rangePreset === p.k ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRangePreset(p.k)}
                  className={cn(
                    "min-h-[40px] text-xs sm:text-sm",
                    rangePreset === p.k
                      ? "bg-[#0f172a] hover:bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a] dark:hover:bg-white"
                      : "bg-transparent border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p.l}
                </Button>
              ))}
            </div>
          )}

          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[180px] min-h-[40px] text-xs sm:text-sm rounded-md bg-[#0f172a] text-white border-[#0f172a] hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:border-white dark:hover:bg-gray-100 font-semibold">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent className="z-[100] bg-card">
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.client_id} value={c.client_id}>
                  <span className="flex items-center gap-2">
                    {c.logo_url ? (
                      <img src={c.logo_url} alt="" className="w-4 h-4 rounded-sm object-contain flex-shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-sm bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground flex-shrink-0">{c.client_name.charAt(0)}</span>
                    )}
                    {c.client_name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Heatmap */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Team Activity Heatmap</h3>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {!loading && sdrs.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No activity data found for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-card text-left text-xs font-semibold text-muted-foreground px-4 py-2 border-b border-border min-w-[180px]">
                    SDR
                  </th>
                  {periods.map(p => (
                    <th
                      key={p}
                      onClick={() => setSelectedPeriod(prev => prev === p ? null : p)}
                      className={cn(
                        "text-xs font-semibold px-2 py-2 border-b border-border text-center cursor-pointer select-none whitespace-nowrap transition-colors",
                        selectedPeriod === p
                          ? "bg-[#2563eb] text-white"
                          : "text-muted-foreground hover:bg-muted/50"
                      )}
                      title="Click to filter summary"
                    >
                      {formatPeriodLabel(p)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sdrs.map(sdr => {
                  const sdrMax = sdrMaxMap.get(sdr) || 0;
                  return (
                    <tr key={sdr} className="border-b border-border/60">
                      <td className="sticky left-0 z-10 bg-card text-sm font-medium text-foreground px-4 py-1.5 whitespace-nowrap">
                        {sdr}
                      </td>
                      {periods.map(p => {
                        const cell = cellMap.get(`${sdr}|${p}`);
                        const dials = cell?.dials || 0;
                        const sqls = cell?.sqls || 0;
                        const level = intensityLevel(dials, sdrMax);
                        const bg = INTENSITY_COLORS[level];
                        const textColor = level === 0 ? "#64748b" : level >= 3 ? "#ffffff" : "#cbd5e1";
                        return (
                          <td key={p} className="p-1">
                            <div
                              className="relative h-9 min-w-[44px] rounded-md flex items-center justify-center text-xs font-medium"
                              style={{ backgroundColor: bg, color: textColor }}
                              title={`${sdr} · ${formatPeriodLabel(p)} · ${dials} dial${dials === 1 ? "" : "s"}${sqls > 0 ? ` · ${sqls} SQL${sqls === 1 ? "" : "s"}` : ""}`}
                            >
                              {dials > 0 ? dials : ""}
                              {sqls > 0 && (
                                <span className="absolute top-0 right-0.5 text-[10px] leading-none">🎯</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {/* Team total row */}
                {sdrs.length > 0 && (
                  <tr style={{ backgroundColor: "#0f172a" }} className="border-t-2 border-[#2563eb]">
                    <td className="sticky left-0 z-10 px-4 py-2 text-sm font-bold text-white whitespace-nowrap" style={{ backgroundColor: "#0f172a" }}>
                      Team Total
                    </td>
                    {periods.map(p => {
                      const t = columnTotals.get(p) || { dials: 0, answered: 0, dms: 0, sqls: 0 };
                      return (
                        <td key={p} className="p-1">
                          <div className="relative h-9 min-w-[44px] rounded-md flex items-center justify-center text-xs font-bold text-white">
                            {t.dials > 0 ? t.dials : ""}
                            {t.sqls > 0 && (
                              <span className="absolute top-0 right-0.5 text-[10px] leading-none">🎯</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard
          icon={<CalendarIcon className="h-4 w-4" />}
          label={peakLabel}
          value={summary.peakLabel}
          subtitle={summary.peakValue > 0 ? `${summary.peakValue.toLocaleString()} dials` : ""}
          color="#94a3b8"
        />
        <SummaryCard
          icon={<Phone className="h-4 w-4" />}
          label="Total Dials"
          value={summary.dials.toLocaleString()}
          subtitle={selectedPeriod ? `${formatPeriodLabel(selectedPeriod)} only` : ""}
          color="#f59e0b"
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Answered"
          value={summary.answered.toLocaleString()}
          subtitle={`${summary.answerRate}% answer rate`}
          color="#10b981"
        />
        <SummaryCard
          icon={<Target className="h-4 w-4" />}
          label="SQLs Booked"
          value={summary.sqls.toLocaleString()}
          subtitle={`${summary.convRate}% conv. rate`}
          color="#f43f5e"
        />
        <SummaryCard
          icon={<Users className="h-4 w-4" />}
          label="Active SDRs"
          value={summary.activeSdrs.toLocaleString()}
          subtitle={selectedPeriod ? "for selected period" : "with dials > 0"}
          color="#94a3b8"
        />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-foreground">Team Dials by {mode.charAt(0).toUpperCase() + mode.slice(1)}</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: "#334155" }} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: "#334155" }} />
                <Tooltip
                  cursor={{ fill: "rgba(148,163,184,0.08)" }}
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9" }}
                  labelStyle={{ color: "#f1f5f9", fontWeight: 600 }}
                />
                {paceTarget > 0 && (
                  <ReferenceLine
                    y={paceTarget}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{ value: `Pace ${paceTarget}`, fill: "#f59e0b", fontSize: 11, position: "right" }}
                  />
                )}
                <Bar dataKey="dials" radius={[4, 4, 0, 0]} onClick={(d: any) => setSelectedPeriod(prev => prev === d.period ? null : d.period)}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.period}
                      cursor="pointer"
                      fill={selectedPeriod === entry.period ? "#60a5fa" : "#2563eb"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#2563eb" }} />
                Dials
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-0 border-t-2 border-dashed" style={{ borderColor: "#f59e0b" }} />
                Pace target
              </span>
            </div>
            <span className="font-semibold text-foreground">Total: {totalDialsAll.toLocaleString()} dials</span>
          </div>
        </Card>
      )}
    </div>
  );
};

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  color: string;
}

const SummaryCard = ({ icon, label, value, subtitle, color }: SummaryCardProps) => (
  <Card className="p-4">
    <div className="flex items-center gap-2 mb-2 text-xs font-medium" style={{ color }}>
      {icon}
      <span>{label}</span>
    </div>
    <div className="text-2xl font-bold text-foreground leading-tight">{value}</div>
    {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
  </Card>
);
