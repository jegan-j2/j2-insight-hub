import { useEffect, useMemo, useState } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  isAfter,
  startOfDay,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { CalendarIcon, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Phone, PhoneCall, Target as TargetIcon, Users } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DateRange } from "react-day-picker";

type Mode = "day" | "week" | "month" | "campaign" | "custom";

interface ClientLite {
  client_id: string;
  client_name: string;
  logo_url: string | null;
  campaign_start?: string | null;
  campaign_end?: string | null;
}

interface HeatmapRow {
  sdr_name: string;
  client_id: string | null;
  client_name: string | null;
  period_key: string;
  dials: number;
  answered: number;
  dms: number;
  sqls: number;
}

// Cell colour scale: light backgrounds for low/zero dials, dark navy for KPI hit.
// Thresholds are absolute KPI-based: 80 dials/day or 10 dials/hour = KPI achieved.
const CELL_STYLES = [
  { bg: "#FFFFFF", text: "#94a3b8", border: "1px solid #E2E8F0" }, // 0
  { bg: "#F1F5F9", text: "#475569", border: "none" },               // below 25% KPI
  { bg: "#CBD5E1", text: "#475569", border: "none" },               // 25–50% KPI
  { bg: "#64748B", text: "#FFFFFF", border: "none" },               // 50–75% KPI
  { bg: "#334155", text: "#FFFFFF", border: "none" },               // 75–99% KPI
  { bg: "#0F172A", text: "#FFFFFF", border: "none" },               // KPI achieved ✅
];

const FUTURE_CELL_STYLE = {
  bg: "#F8FAFC",
  text: "#CBD5E1",
  border: "1px dashed #E2E8F0",
};

const intensityLevel = (value: number, isHour: boolean): number => {
  if (value <= 0) return 0;
  if (isHour) {
    if (value <= 2)  return 1;
    if (value <= 4)  return 2;
    if (value <= 7)  return 3;
    if (value <= 9)  return 4;
    return 5; // 10+ per hour = KPI hit
  } else {
    if (value <= 20) return 1;
    if (value <= 40) return 2;
    if (value <= 60) return 3;
    if (value <= 79) return 4;
    return 5; // 80+ per day = KPI hit
  }
};

const melbourneToday = (): Date => {
  const now = toZonedTime(new Date(), "Australia/Melbourne");
  return startOfDay(now);
};

const HOUR_KEYS = ["09", "10", "11", "12", "13", "14", "15", "16", "17", "18"];
const HOUR_LABELS: Record<string, string> = {
  "09": "9AM", "10": "10AM", "11": "11AM", "12": "12PM",
  "13": "1PM", "14": "2PM", "15": "3PM", "16": "4PM", "17": "5PM", "18": "6PM",
};

interface Props {
  clients: ClientLite[];
}

export const TeamHeatmap = ({ clients }: Props) => {
  const [mode, setMode] = useState<Mode>("day");
  const [clientFilter, setClientFilter] = useState<string>("all");

  // Day mode date
  const [dayDate, setDayDate] = useState<Date>(() => melbourneToday());
  const [dayPopoverOpen, setDayPopoverOpen] = useState(false);

  // Week mode date (any date inside the desired week)
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => melbourneToday());
  const [weekPopoverOpen, setWeekPopoverOpen] = useState(false);

  // Month mode date (any date inside the desired month)
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => melbourneToday());
  const [monthPopoverOpen, setMonthPopoverOpen] = useState(false);

  // Custom range
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);

  const [data, setData] = useState<HeatmapRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);

  const selectedClient = useMemo(
    () => (clientFilter === "all" ? null : clients.find(c => c.client_id === clientFilter) || null),
    [clientFilter, clients]
  );

  // If switching to All Clients while in Campaign mode, default to Week.
  useEffect(() => {
    if (clientFilter === "all" && mode === "campaign") {
      setMode("week");
    }
  }, [clientFilter, mode]);

  // Compute the date range for RPC + the visible column list
  const { startDate, endDate, columnDates, isHourMode } = useMemo(() => {
    const today = melbourneToday();
    if (mode === "day") {
      const d = format(dayDate, "yyyy-MM-dd");
      return { startDate: d, endDate: d, columnDates: [] as Date[], isHourMode: true };
    }
    if (mode === "week") {
      const ws = startOfWeek(weekAnchor, { weekStartsOn: 1 }); // Monday
      const we = endOfWeek(weekAnchor, { weekStartsOn: 1 }); // Sunday
      const allDays = eachDayOfInterval({ start: ws, end: we }).filter(d => !isWeekend(d));
      // Pass Mon..Fri (5 working days) — RPC expects Friday as p_end_date
      const fri = allDays[allDays.length - 1] ?? ws;
      return {
        startDate: format(ws, "yyyy-MM-dd"),
        endDate: format(fri, "yyyy-MM-dd"),
        columnDates: allDays,
        isHourMode: false,
      };
    }
    if (mode === "month") {
      const ms = startOfMonth(monthAnchor);
      const me = endOfMonth(monthAnchor);
      const days = eachDayOfInterval({ start: ms, end: me }).filter(d => !isWeekend(d));
      return {
        startDate: format(ms, "yyyy-MM-dd"),
        endDate: format(me, "yyyy-MM-dd"),
        columnDates: days,
        isHourMode: false,
      };
    }
    if (mode === "campaign") {
      if (selectedClient?.campaign_start && selectedClient?.campaign_end) {
        const cs = new Date(selectedClient.campaign_start + "T00:00:00");
        const ce = new Date(selectedClient.campaign_end + "T00:00:00");
        const days = eachDayOfInterval({ start: cs, end: ce }).filter(d => !isWeekend(d));
        return {
          startDate: selectedClient.campaign_start,
          endDate: selectedClient.campaign_end,
          columnDates: days,
          isHourMode: false,
        };
      }
      return { startDate: "", endDate: "", columnDates: [], isHourMode: false };
    }
    // custom
    if (customRange?.from && customRange?.to) {
      const days = eachDayOfInterval({ start: customRange.from, end: customRange.to }).filter(d => !isWeekend(d));
      return {
        startDate: format(customRange.from, "yyyy-MM-dd"),
        endDate: format(customRange.to, "yyyy-MM-dd"),
        columnDates: days,
        isHourMode: false,
      };
    }
    return { startDate: "", endDate: "", columnDates: [], isHourMode: false };
  }, [mode, dayDate, weekAnchor, monthAnchor, selectedClient, customRange]);

  // Fetch data
  useEffect(() => {
    let cancelled = false;
    if (!startDate || !endDate) {
      setData([]);
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      setErrored(false);
      try {
        // Always pass p_mode='day' — frontend handles hour vs day grouping.
        // Day mode needs hour bucketing, so pass 'hour'. The RPC uses p_mode='hour'
        // with start_date == end_date for hourly bucketing.
        const rpcMode = isHourMode ? "hour" : "day";
        const { data: rows, error } = await supabase.rpc("get_team_heatmap", {
          p_mode: rpcMode,
          p_start_date: startDate,
          p_end_date: endDate,
          p_client_id: clientFilter === "all" ? null : clientFilter,
        } as any);
        if (cancelled) return;
        if (error) {
          console.error("get_team_heatmap error", error);
          setErrored(true);
          setData([]);
        } else {
          setData((rows || []) as HeatmapRow[]);
        }
      } catch (err) {
        if (!cancelled) {
          setErrored(true);
          setData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, clientFilter, isHourMode]);

  // Build SDR list (alphabetical by first name) and column keys
  const clientLookup = useMemo(() => {
    const m = new Map<string, ClientLite>();
    for (const c of clients) m.set(c.client_id, c);
    return m;
  }, [clients]);

  // Map sdr_name -> { client_id, client_name } using the client with most dials in the period
  const sdrClientMap = useMemo(() => {
    const totals = new Map<string, Map<string, number>>();
    const namesByClient = new Map<string, string>();
    for (const r of data) {
      if (!r.sdr_name || !r.client_id) continue;
      let inner = totals.get(r.sdr_name);
      if (!inner) {
        inner = new Map<string, number>();
        totals.set(r.sdr_name, inner);
      }
      inner.set(r.client_id, (inner.get(r.client_id) || 0) + (r.dials || 0));
      if (r.client_name && !namesByClient.has(r.client_id)) {
        namesByClient.set(r.client_id, r.client_name);
      }
    }
    const m = new Map<string, { client_id: string; client_name: string }>();
    for (const [sdr, inner] of totals.entries()) {
      let bestClient = "";
      let bestCount = -1;
      for (const [cid, count] of inner.entries()) {
        if (count > bestCount) {
          bestCount = count;
          bestClient = cid;
        }
      }
      if (bestClient) {
        m.set(sdr, {
          client_id: bestClient,
          client_name: namesByClient.get(bestClient) || "",
        });
      }
    }
    return m;
  }, [data]);

  const sdrs = useMemo(() => {
    const set = new Set<string>();
    for (const r of data) {
      if (r.sdr_name) set.add(r.sdr_name);
    }
    const arr = Array.from(set);
    arr.sort((a, b) => {
      const fa = a.split(" ")[0]?.toLowerCase() || a.toLowerCase();
      const fb = b.split(" ")[0]?.toLowerCase() || b.toLowerCase();
      return fa.localeCompare(fb);
    });
    return arr;
  }, [data]);

  // Column keys for the visible grid
  const columnKeys = useMemo(() => {
    if (isHourMode) return HOUR_KEYS;
    return columnDates.map(d => format(d, "yyyy-MM-dd"));
  }, [isHourMode, columnDates]);

  // Build cell map keyed by `${sdr}|${columnKey}`
  const cellMap = useMemo(() => {
    const m = new Map<string, HeatmapRow>();
    for (const r of data) {
      if (!r.sdr_name) continue;
      m.set(`${r.sdr_name}|${r.period_key}`, r);
    }
    return m;
  }, [data]);


  const today = melbourneToday();

  const formatColumnHeader = (key: string): string => {
    if (isHourMode) return HOUR_LABELS[key] ?? key;
    const d = new Date(key + "T00:00:00");
    return format(d, "EEE d MMM");
  };

  const isFutureColumn = (key: string): boolean => {
    if (isHourMode) return false;
    const d = new Date(key + "T00:00:00");
    return isAfter(startOfDay(d), today);
  };

  // Summary totals across all visible SDRs/columns
  const summary = useMemo(() => {
    let dials = 0;
    let answered = 0;
    let sqls = 0;
    const activeSdrs = new Set<string>();
    for (const r of data) {
      if (!r.sdr_name) continue;
      dials += r.dials || 0;
      answered += r.answered || 0;
      sqls += r.sqls || 0;
      if ((r.dials || 0) > 0) activeSdrs.add(r.sdr_name);
    }
    const answerRate = dials > 0 ? Math.round((answered / dials) * 1000) / 10 : 0;
    const convRate = dials > 0 ? Math.round((sqls / dials) * 1000) / 10 : 0;
    return { dials, answered, sqls, activeSdrs: activeSdrs.size, answerRate, convRate };
  }, [data]);

  // Aggregated chart data: total team dials per period bucket
  const chartData = useMemo(() => {
    const totals = new Map<string, number>();
    for (const k of columnKeys) totals.set(k, 0);
    for (const r of data) {
      if (totals.has(r.period_key)) {
        totals.set(r.period_key, (totals.get(r.period_key) || 0) + (r.dials || 0));
      }
    }
    return columnKeys.map(k => ({
      key: k,
      label: formatColumnHeader(k),
      dials: totals.get(k) || 0,
    }));
  }, [columnKeys, data, isHourMode]);


  const buildTooltip = (sdr: string, key: string): string => {
    const cell = cellMap.get(`${sdr}|${key}`);
    const dials = cell?.dials || 0;
    const answered = cell?.answered || 0;
    const sqls = cell?.sqls || 0;
    const headLabel = formatColumnHeader(key);
    const sqlPart = sqls > 0 ? ` · ${sqls} 🎯` : "";
    return `${headLabel} — ${dials} dial${dials === 1 ? "" : "s"} · ${answered} answered${sqlPart}`;
  };

  const showCampaignTab = clientFilter !== "all" && !!selectedClient?.campaign_start && !!selectedClient?.campaign_end;

  return (
    <div className="space-y-4">
      {/* Filter row — mode toggle (left) + date display (middle) + client dropdown (right) */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Mode toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { k: "day", l: "Day" },
              { k: "week", l: "Week" },
              { k: "month", l: "Month" },
              ...(showCampaignTab ? [{ k: "campaign" as Mode, l: "Campaign" }] : []),
              { k: "custom", l: "Custom" },
            ] as { k: Mode; l: string }[]
          ).map(p => {
            const active = mode === p.k;
            return (
              <Button
                key={p.k}
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => setMode(p.k)}
                className={cn(
                  "transition-all duration-200 min-h-[40px] active:scale-95 text-xs sm:text-sm",
                  active
                    ? "bg-[#0f172a] hover:bg-[#0f172a] text-white font-semibold shadow-sm dark:bg-white dark:hover:bg-white dark:text-[#0f172a]"
                    : "bg-transparent text-muted-foreground border border-border hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {p.l}
              </Button>
            );
          })}
        </div>

        {/* Date display (middle) */}
        <div className="flex items-center">
          {mode === "day" && (
            <Popover open={dayPopoverOpen} onOpenChange={setDayPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-h-[40px] gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dayDate, "EEE, MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[100]" align="start">
                <Calendar
                  mode="single"
                  selected={dayDate}
                  onSelect={d => {
                    if (d) {
                      setDayDate(d);
                      setDayPopoverOpen(false);
                    }
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          )}

          {mode === "week" && (
            <Popover open={weekPopoverOpen} onOpenChange={setWeekPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-h-[40px] gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {(() => {
                    const ws = startOfWeek(weekAnchor, { weekStartsOn: 1 });
                    const we = endOfWeek(weekAnchor, { weekStartsOn: 1 });
                    return `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
                  })()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[100]" align="start">
                <Calendar
                  mode="single"
                  selected={weekAnchor}
                  onSelect={d => {
                    if (d) {
                      setWeekAnchor(d);
                      setWeekPopoverOpen(false);
                    }
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          )}

          {mode === "month" && (
            <Popover open={monthPopoverOpen} onOpenChange={setMonthPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-h-[40px] gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(monthAnchor, "MMMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[100]" align="start">
                <Calendar
                  mode="single"
                  selected={monthAnchor}
                  onSelect={d => {
                    if (d) {
                      setMonthAnchor(d);
                      setMonthPopoverOpen(false);
                    }
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          )}

          {mode === "campaign" && (
            <div className="text-xs sm:text-sm text-muted-foreground inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card min-h-[40px]">
              <CalendarIcon className="h-4 w-4" />
              {selectedClient?.campaign_start && selectedClient?.campaign_end ? (
                <span>
                  Campaign: {format(new Date(selectedClient.campaign_start + "T00:00:00"), "MMM d, yyyy")} – {format(new Date(selectedClient.campaign_end + "T00:00:00"), "MMM d, yyyy")}
                </span>
              ) : (
                <span>No campaign dates set for this client</span>
              )}
            </div>
          )}

          {mode === "custom" && (
            <Popover open={customPopoverOpen} onOpenChange={setCustomPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-h-[40px] gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {customRange?.from && customRange?.to
                    ? `${format(customRange.from, "MMM d")} – ${format(customRange.to, "MMM d, yyyy")}`
                    : "Pick a date range"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[100]" align="start">
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={range => {
                    setCustomRange(range);
                    if (range?.from && range?.to) setCustomPopoverOpen(false);
                  }}
                  numberOfMonths={2}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Client filter (right aligned) */}
        <div className="ml-auto">
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger
              className={cn(
                "w-[180px] min-h-[40px] text-xs sm:text-sm rounded-md transition-all duration-200",
                "bg-[#0f172a] text-white border-[#0f172a] hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:border-white dark:hover:bg-gray-100 font-semibold"
              )}
            >
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
                      <span className="w-4 h-4 rounded-sm bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground flex-shrink-0">
                        {c.client_name.charAt(0)}
                      </span>
                    )}
                    {c.client_name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Heatmap card */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Team Activity Heatmap</h3>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {loading ? (
          <div className="px-5 py-12 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : errored || sdrs.length === 0 || columnKeys.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No activity data for this period
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <table
              className="border-collapse"
              style={{
                tableLayout: "fixed",
                width: "100%",
                minWidth: columnKeys.length <= 5
                  ? "100%"
                  : `calc(160px + 140px + ${columnKeys.length} * ((100vw - 300px) / 5))`
              }}
            >
              <thead>
                <tr>
                  <th
                    className="sticky left-0 z-20 text-left text-sm font-bold px-4 py-3 whitespace-nowrap"
                    style={{
                      minWidth: 200,
                      width: 200,
                      backgroundColor: "#0F172A",
                      color: "#FFFFFF",
                      ...(clientFilter !== "all"
                        ? { borderRight: "2px solid #E2E8F0" }
                        : {}),
                    }}
                  >
                    SDR
                  </th>
                  {clientFilter === "all" && (
                    <th
                      className="sticky z-20 text-left text-sm font-bold px-4 py-3 whitespace-nowrap"
                      style={{
                        left: 200,
                        minWidth: 160,
                        width: 160,
                        backgroundColor: "#0F172A",
                        color: "#FFFFFF",
                        borderRight: "2px solid #E2E8F0",
                      }}
                    >
                      Client
                    </th>
                  )}
                  {columnKeys.map(k => (
                    <th
                      key={k}
                      className="text-sm font-bold px-2 py-3 text-center whitespace-nowrap"
                      style={{ backgroundColor: "#0F172A", color: "#FFFFFF" }}
                    >
                      {formatColumnHeader(k)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sdrs.map((sdr, idx) => {
                  const sdrClientInfo = sdrClientMap.get(sdr);
                  const sdrClient = sdrClientInfo
                    ? clientLookup.get(sdrClientInfo.client_id)
                    : null;
                  const displayClientName =
                    sdrClient?.client_name || sdrClientInfo?.client_name || null;
                  const displayLogoUrl = sdrClient?.logo_url || null;
                  const rowBg = idx % 2 === 0 ? "#FFFFFF" : "#F1F5F9";
                  return (
                    <tr
                      key={sdr}
                      className="group transition-colors"
                      style={{ backgroundColor: rowBg }}
                    >
                      <td
                        className="sticky left-0 z-10 px-4 py-2 align-middle group-hover:!bg-[#EFF6FF]"
                        style={{
                          minWidth: 200,
                          width: 200,
                          backgroundColor: rowBg,
                          ...(clientFilter !== "all"
                            ? { borderRight: "2px solid #E2E8F0" }
                            : {}),
                        }}
                      >
                        <div
                          className="text-sm font-medium leading-tight whitespace-nowrap"
                          style={{ color: "#0F172A" }}
                        >
                          {sdr}
                        </div>
                      </td>
                      {clientFilter === "all" && (
                        <td
                          className="sticky z-10 px-4 py-2 align-middle group-hover:!bg-[#EFF6FF]"
                          style={{
                            left: 200,
                            minWidth: 160,
                            width: 160,
                            backgroundColor: rowBg,
                            borderRight: "2px solid #E2E8F0",
                          }}
                        >
                          {displayClientName ? (
                            <div className="flex items-center gap-2">
                              {displayLogoUrl ? (
                                <img
                                  src={displayLogoUrl}
                                  alt=""
                                  className="w-4 h-4 rounded-full object-contain flex-shrink-0"
                                />
                              ) : (
                                <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground flex-shrink-0">
                                  {displayClientName.charAt(0)}
                                </span>
                              )}
                              <span
                                className="truncate text-sm"
                                style={{ color: "#0F172A" }}
                              >
                                {displayClientName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                      {columnKeys.map(k => {
                        const cell = cellMap.get(`${sdr}|${k}`);
                        const dials = cell?.dials || 0;
                        const sqls = cell?.sqls || 0;
                        const future = isFutureColumn(k);
                        const style = future
                          ? FUTURE_CELL_STYLE
                          : CELL_STYLES[intensityLevel(dials, isHourMode)];
                        
                        return (
                          <td
                            key={k}
                            className="group-hover:!bg-[#EFF6FF]"
                            style={{ padding: 4, backgroundColor: rowBg }}
                          >
                            <div
                              className="relative rounded-md flex items-center justify-center text-xs font-semibold"
                              style={{
                                width: "100%",
                                minWidth: "100%",
                                height: 40,
                                backgroundColor: style.bg,
                                color: style.text,
                                border: style.border,
                              }}
                              title={buildTooltip(sdr, k)}
                            >
                              {future ? <span>—</span> : dials}
                              {sqls > 0 && (
                                <span
                                  className="absolute leading-none"
                                  style={{ top: 2, right: 3, fontSize: 12 }}
                                >
                                  🎯
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Summary stat cards */}
      {!loading && !errored && sdrs.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "Total Dials",
                value: summary.dials.toLocaleString(),
                subtitle: null as string | null,
                icon: Phone,
                iconColor: "text-amber-500",
                iconBg: "bg-amber-500/10",
              },
              {
                title: "Answered",
                value: summary.answered.toLocaleString(),
                subtitle: `${summary.answerRate}% answer rate`,
                icon: PhoneCall,
                iconColor: "text-emerald-500",
                iconBg: "bg-emerald-500/10",
              },
              {
                title: "SQLs",
                value: summary.sqls.toLocaleString(),
                subtitle: `${summary.convRate}% conversion rate`,
                icon: TargetIcon,
                iconColor: "text-rose-500",
                iconBg: "bg-rose-500/10",
              },
              {
                title: "Active SDRs",
                value: summary.activeSdrs.toLocaleString(),
                subtitle: null,
                icon: Users,
                iconColor: "text-indigo-500",
                iconBg: "bg-indigo-500/10",
              },
            ].map(card => (
              <Card key={card.title} className="bg-card/50 backdrop-blur-sm border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <div className={cn("p-2 rounded-lg", card.iconBg)}>
                      <card.icon className={cn("h-5 w-5", card.iconColor)} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{card.value}</p>
                  {card.subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Team Dials chart */}
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">
                {isHourMode ? "Team Dials by Hour" : "Team Dials by Day"}
              </h3>
            </div>
            <CardContent className="p-5">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <RTooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: any) => [`${Number(v).toLocaleString()} dials`, "Dials"]}
                    />
                    <Bar dataKey="dials" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill="#0f172a"
                          onMouseEnter={(e: any) => {
                            if (e?.target) e.target.setAttribute("fill", "#1e3a5f");
                          }}
                          onMouseLeave={(e: any) => {
                            if (e?.target) e.target.setAttribute("fill", "#0f172a");
                          }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <div className="text-muted-foreground font-medium">
                  Total: {summary.dials.toLocaleString()} dials
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span style={{ color: "#0f172a" }} className="text-base leading-none dark:text-white">●</span>
                  <span>Dials</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
