import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
import { CalendarIcon, Loader2, Download, ChevronDown, FileText, Table2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Phone, PhoneCall, Target as TargetIcon, Users, MessageSquare } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Cell } from "recharts";
import type { DateRange } from "react-day-picker";
import * as XLSX from "xlsx-js-style";
import { toCSV, downloadCSV } from "@/lib/csvExport";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";

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

const CELL_STYLES = [
  { bg: "#FFFFFF", text: "#94a3b8", border: "1px solid #E2E8F0" },
  { bg: "#F1F5F9", text: "#475569", border: "none" },
  { bg: "#CBD5E1", text: "#475569", border: "none" },
  { bg: "#64748B", text: "#FFFFFF", border: "none" },
  { bg: "#334155", text: "#FFFFFF", border: "none" },
  { bg: "#0F172A", text: "#FFFFFF", border: "none" },
];

const FUTURE_CELL_STYLE = {
  bg: "#F8FAFC",
  text: "#CBD5E1",
  border: "1px dashed #E2E8F0",
};

const intensityLevel = (value: number, isHour: boolean): number => {
  if (value <= 0) return 0;
  if (isHour) {
    if (value <= 2) return 1;
    if (value <= 4) return 2;
    if (value <= 7) return 3;
    if (value <= 9) return 4;
    return 5;
  } else {
    if (value <= 20) return 1;
    if (value <= 40) return 2;
    if (value <= 60) return 3;
    if (value <= 79) return 4;
    return 5;
  }
};

const melbourneToday = (): Date => {
  const now = toZonedTime(new Date(), "Australia/Melbourne");
  return startOfDay(now);
};

const HOUR_KEYS = ["09", "10", "11", "12", "13", "14", "15", "16", "17", "18"];
const HOUR_LABELS: Record<string, string> = {
  "09": "9AM",
  "10": "10AM",
  "11": "11AM",
  "12": "12PM",
  "13": "1PM",
  "14": "2PM",
  "15": "3PM",
  "16": "4PM",
  "17": "5PM",
  "18": "6PM",
};

// Avatar colour system — matches SDRAvatar.tsx exactly
const AVATAR_COLOR_MAP: Record<number, string> = {
  0: "#0891b2",
  1: "#2563eb",
  2: "#9333ea",
  3: "#16a34a",
  4: "#ea580c",
  5: "#0d9488",
  6: "#4f46e5",
  7: "#e11d48",
  8: "#7c3aed",
  9: "#059669",
  10: "#d97706",
  11: "#db2777",
  12: "#0284c7",
  13: "#65a30d",
  14: "#c026d3",
  15: "#dc2626",
  16: "#0e7490",
  17: "#1d4ed8",
  18: "#7e22ce",
  19: "#047857",
};
function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLOR_MAP[Math.abs(hash) % 20];
}
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || "?").toUpperCase();
}
const SDR_COL_W = 200;
const CLIENT_COL_W = 160;
const ATT_COL_W = 120; // wider to fit "Fri, 24 Apr" without overflow
const FROZEN_W = SDR_COL_W + CLIENT_COL_W + ATT_COL_W; // 480px

const CELL_H = 48; // row cell height — matches leaderboard row spacing

interface Props {
  clients: ClientLite[];
}

export const TeamHeatmap = ({ clients }: Props) => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [mode, _setMode] = useState<Mode>(() => {
    const m = searchParams.get("mode");
    if (m === "week" || m === "month" || m === "campaign" || m === "custom") return m;
    return "day";
  });

  const setMode = useCallback(
    (next: Mode) => {
      _setMode(next);
      const params = new URLSearchParams(searchParams);
      params.set("mode", next);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const [clientFilter, setClientFilter] = useState<string>("all");
  const [dayDate, setDayDate] = useState<Date>(() => melbourneToday());
  const [dayPopoverOpen, setDayPopoverOpen] = useState(false);
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => melbourneToday());
  const [weekPopoverOpen, setWeekPopoverOpen] = useState(false);
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => melbourneToday());
  const [monthPopoverOpen, setMonthPopoverOpen] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [data, setData] = useState<HeatmapRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);
  const [cellWidth, setCellWidth] = useState(160);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Dark mode detection — drives all table inline colours
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const recalcCellWidth = useCallback(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    const containerW = el.getBoundingClientRect().width;
    if (containerW <= 0) return;
    const available = containerW - FROZEN_W;
    const w = Math.floor(available / 5);
    if (w > 0) setCellWidth(w);
  }, []);

  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => recalcCellWidth());
    const observer = new ResizeObserver(() => recalcCellWidth());
    observer.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [recalcCellWidth]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => recalcCellWidth());
    return () => cancelAnimationFrame(raf);
  }, [mode, clientFilter, recalcCellWidth]);

  const selectedClient = useMemo(
    () => (clientFilter === "all" ? null : clients.find((c) => c.client_id === clientFilter) || null),
    [clientFilter, clients],
  );

  useEffect(() => {
    if (clientFilter === "all" && mode === "campaign") setMode("week");
  }, [clientFilter, mode]);

  const { startDate, endDate, columnDates, isHourMode } = useMemo(() => {
    if (mode === "day") {
      const d = format(dayDate, "yyyy-MM-dd");
      return { startDate: d, endDate: d, columnDates: [] as Date[], isHourMode: true };
    }
    if (mode === "week") {
      const ws = startOfWeek(weekAnchor, { weekStartsOn: 1 });
      const we = endOfWeek(weekAnchor, { weekStartsOn: 1 });
      const allDays = eachDayOfInterval({ start: ws, end: we }).filter((d) => !isWeekend(d));
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
      const days = eachDayOfInterval({ start: ms, end: me }).filter((d) => !isWeekend(d));
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
        const days = eachDayOfInterval({ start: cs, end: ce }).filter((d) => !isWeekend(d));
        return {
          startDate: selectedClient.campaign_start,
          endDate: selectedClient.campaign_end,
          columnDates: days,
          isHourMode: false,
        };
      }
      return { startDate: "", endDate: "", columnDates: [], isHourMode: false };
    }
    if (customRange?.from && customRange?.to) {
      const days = eachDayOfInterval({ start: customRange.from, end: customRange.to }).filter((d) => !isWeekend(d));
      return {
        startDate: format(customRange.from, "yyyy-MM-dd"),
        endDate: format(customRange.to, "yyyy-MM-dd"),
        columnDates: days,
        isHourMode: false,
      };
    }
    return { startDate: "", endDate: "", columnDates: [], isHourMode: false };
  }, [mode, dayDate, weekAnchor, monthAnchor, selectedClient, customRange]);

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
      } catch {
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

  const clientLookup = useMemo(() => {
    const m = new Map<string, ClientLite>();
    for (const c of clients) m.set(c.client_id, c);
    return m;
  }, [clients]);

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
      if (r.client_name && !namesByClient.has(r.client_id)) namesByClient.set(r.client_id, r.client_name);
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
      if (bestClient) m.set(sdr, { client_id: bestClient, client_name: namesByClient.get(bestClient) || "" });
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

  const columnKeys = useMemo(() => {
    if (isHourMode) return HOUR_KEYS;
    return columnDates.map((d) => format(d, "yyyy-MM-dd"));
  }, [isHourMode, columnDates]);

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
    return format(d, "EEE, d MMM");
  };

  const isFutureColumn = (key: string): boolean => {
    if (isHourMode) return false;
    const d = new Date(key + "T00:00:00");
    return isAfter(startOfDay(d), today);
  };

  // attendancePill — after columnKeys, cellMap, isFutureColumn
  const attendancePill = useCallback(
    (sdr: string): { label: string; bg: string; color: string } => {
      if (isHourMode) {
        const hasAny = columnKeys.some((k) => (cellMap.get(`${sdr}|${k}`)?.dials || 0) > 0);
        return hasAny
          ? { label: "✓ Present", bg: "#dcfce7", color: "#166534" }
          : { label: "✕ Absent", bg: "#fee2e2", color: "#991b1b" };
      }
      const pastKeys = columnKeys.filter((k) => !isFutureColumn(k));
      const totalDays = pastKeys.length;
      const presentDays = pastKeys.filter((k) => (cellMap.get(`${sdr}|${k}`)?.dials || 0) > 0).length;
      if (totalDays === 0) return { label: "—", bg: "#f1f5f9", color: "#94a3b8" };
      const ratio = presentDays / totalDays;
      const bg = ratio >= 1 ? "#dcfce7" : ratio >= 0.5 ? "#fef9c3" : "#fee2e2";
      const color = ratio >= 1 ? "#166534" : ratio >= 0.5 ? "#854d0e" : "#991b1b";
      return { label: `${presentDays}/${totalDays} Days`, bg, color };
    },
    [isHourMode, columnKeys, cellMap],
  );

  // Export — after sdrs, columnKeys, cellMap, sdrClientMap, attendancePill
  const buildExportRows = useCallback(() => {
    const headers = ["SDR", "Client", "Attendance", ...columnKeys.map((k) => formatColumnHeader(k))];
    const rows = sdrs.map((sdr) => {
      const sdrClientInfo = sdrClientMap.get(sdr);
      const clientName = sdrClientInfo?.client_name || "";
      const pill = attendancePill(sdr);
      const cells = columnKeys.map((k) => cellMap.get(`${sdr}|${k}`)?.dials || 0);
      return [sdr, clientName, pill.label, ...cells];
    });
    return { headers, rows };
  }, [sdrs, columnKeys, cellMap, sdrClientMap, attendancePill]);

  const handleExportCSV = useCallback(() => {
    setExportingCSV(true);
    try {
      const { headers, rows } = buildExportRows();
      const dateStr = format(new Date(), "yyyy-MM-dd");
      downloadCSV(toCSV(headers, rows), `j2-heatmap-${dateStr}.csv`);
      toast({ title: "CSV exported successfully", className: "border-[#10b981]" });
    } finally {
      setExportingCSV(false);
    }
  }, [buildExportRows, toast]);

  const handleExportExcel = useCallback(() => {
    setExportingExcel(true);
    try {
      const { headers, rows } = buildExportRows();
      const dateStr = format(new Date(), "yyyy-MM-dd");
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" }, name: "Arial", sz: 11 },
        fill: { fgColor: { rgb: "0F172A" } },
      };
      const evenRow = { fill: { fgColor: { rgb: "F1F5F9" } } };
      const oddRow = { fill: { fgColor: { rgb: "FFFFFF" } } };
      const allRows = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(allRows);
      ws["!cols"] = [{ wch: 22 }, { wch: 18 }, { wch: 14 }, ...columnKeys.map(() => ({ wch: 12 }))];
      allRows.forEach((_, i) => {
        const style = i === 0 ? headerStyle : i % 2 === 0 ? evenRow : oddRow;
        headers.forEach((__, c) => {
          const cell = XLSX.utils.encode_cell({ r: i, c });
          if (ws[cell]) ws[cell].s = style;
        });
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Team Heatmap");
      XLSX.writeFile(wb, `j2-heatmap-${dateStr}.xlsx`);
      toast({ title: "Excel exported successfully", className: "border-[#10b981]" });
    } catch (err) {
      toast({ title: "Export failed", description: String(err), variant: "destructive" });
    } finally {
      setExportingExcel(false);
    }
  }, [buildExportRows, columnKeys, toast]);

  const summary = useMemo(() => {
    let dials = 0;
    let answered = 0;
    let sqls = 0;
    let dms = 0;
    const activeSdrs = new Set<string>();
    for (const r of data) {
      if (!r.sdr_name) continue;
      dials += r.dials || 0;
      answered += r.answered || 0;
      sqls += r.sqls || 0;
      dms += r.dms || 0;
      if ((r.dials || 0) > 0) activeSdrs.add(r.sdr_name);
    }
    const answerRate = dials > 0 ? Math.round((answered / dials) * 1000) / 10 : 0;
    const convRate = dials > 0 ? Math.round((sqls / dials) * 1000) / 10 : 0;
    return { dials, answered, sqls, dms, activeSdrs: activeSdrs.size, answerRate, convRate };
  }, [data]);

  const chartData = useMemo(() => {
    const totals = new Map<string, { dials: number; answered: number; dms: number }>();
    for (const k of columnKeys) totals.set(k, { dials: 0, answered: 0, dms: 0 });
    for (const r of data) {
      const t = totals.get(r.period_key);
      if (t) {
        t.dials += r.dials || 0;
        t.answered += r.answered || 0;
        t.dms += r.dms || 0;
      }
    }
    return columnKeys.map((k) => {
      const t = totals.get(k) || { dials: 0, answered: 0, dms: 0 };
      const otherDials = Math.max(0, t.dials - t.answered - t.dms);
      return {
        key: k,
        label: formatColumnHeader(k),
        dials: t.dials,
        answered: t.answered,
        dms: t.dms,
        dialsOnly: otherDials,
      };
    });
  }, [columnKeys, data, isHourMode]);

  const buildTooltip = (sdr: string, key: string): string => {
    const cell = cellMap.get(`${sdr}|${key}`);
    const dials = cell?.dials || 0;
    const answered = cell?.answered || 0;
    const sqls = cell?.sqls || 0;
    const sqlPart = sqls > 0 ? ` · ${sqls} 🎯` : "";
    return `${formatColumnHeader(key)} — ${dials} dial${dials === 1 ? "" : "s"} · ${answered} answered${sqlPart}`;
  };

  const showCampaignTab = clientFilter !== "all" && !!selectedClient?.campaign_start && !!selectedClient?.campaign_end;
  const tableMinWidth = columnKeys.length <= 5 ? "100%" : FROZEN_W + columnKeys.length * cellWidth;

  // Selected client display for card header
  const selectedClientDisplay = useMemo(() => {
    if (clientFilter === "all") return null;
    return clients.find((c) => c.client_id === clientFilter) || null;
  }, [clientFilter, clients]);

  return (
    <div className="space-y-4">
      {/* ── Filter row: mode tabs + date picker + Export (right-aligned) ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Mode tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { k: "day", l: "Day" },
              { k: "week", l: "Week" },
              { k: "month", l: "Month" },
              ...(showCampaignTab ? [{ k: "campaign" as Mode, l: "Campaign" }] : []),
              { k: "custom", l: "Custom" },
            ] as { k: Mode; l: string }[]
          ).map((p) => {
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
                    : "bg-transparent text-muted-foreground border border-border hover:bg-muted/50 hover:text-foreground",
                )}
              >
                {p.l}
              </Button>
            );
          })}
        </div>

        {/* Date picker */}
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
                  onSelect={(d) => {
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
                  onSelect={(d) => {
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
                  onSelect={(d) => {
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
                  Campaign: {format(new Date(selectedClient.campaign_start + "T00:00:00"), "MMM d, yyyy")} –{" "}
                  {format(new Date(selectedClient.campaign_end + "T00:00:00"), "MMM d, yyyy")}
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
                  onSelect={(range) => {
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

        {/* Export — right-aligned, matches leaderboard pattern */}
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={loading || sdrs.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100 font-medium text-sm transition-colors disabled:opacity-50 min-h-[40px]"
              >
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4 ml-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV} disabled={exportingCSV}>
                <FileText className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel} disabled={exportingExcel}>
                <Table2 className="h-4 w-4 mr-2" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Heatmap card ── */}
      <Card className="overflow-hidden">
        {/* Card header: title + loading spinner + client filter (matches leaderboard) */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-xl font-bold text-foreground">Team Activity Heatmap</h3>
          <div className="flex items-center gap-3">
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {/* Client filter in card header — matches leaderboard */}
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger
                className={cn(
                  "w-[180px] min-h-[36px] text-xs sm:text-sm rounded-md transition-all duration-200",
                  "bg-[#0f172a] text-white border-[#0f172a] hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:border-white dark:hover:bg-gray-100 font-semibold",
                )}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {selectedClientDisplay ? (
                    <>
                      {selectedClientDisplay.logo_url ? (
                        <img
                          src={selectedClientDisplay.logo_url}
                          alt=""
                          className="w-4 h-4 rounded-sm object-contain flex-shrink-0"
                        />
                      ) : (
                        <span className="w-4 h-4 rounded-sm bg-white/20 flex items-center justify-center text-[8px] font-bold flex-shrink-0">
                          {selectedClientDisplay.client_name.charAt(0)}
                        </span>
                      )}
                      <span className="truncate">{selectedClientDisplay.client_name}</span>
                    </>
                  ) : (
                    <span>All Clients</span>
                  )}
                </div>
              </SelectTrigger>
              <SelectContent className="z-[100] bg-card">
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map((c) => (
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

        {loading ? (
          <div className="px-5 py-12 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : errored || sdrs.length === 0 || columnKeys.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">No activity data for this period</div>
        ) : (
          <div className="overflow-x-auto" ref={tableContainerRef}>
            <table className="border-collapse" style={{ tableLayout: "fixed", width: "100%", minWidth: tableMinWidth }}>
              <thead>
                <tr>
                  <th
                    className="sticky left-0 z-20 text-left text-sm font-bold px-4 py-3 whitespace-nowrap"
                    style={{
                      width: SDR_COL_W,
                      minWidth: SDR_COL_W,
                      maxWidth: SDR_COL_W,
                      background: isDark ? "linear-gradient(to bottom, #1E293B, #162032)" : "#0F172A",
                      color: "#FFFFFF",
                      borderBottom: isDark ? "1px solid #334155" : "none",
                    }}
                  >
                    SDR
                  </th>
                  <th
                    className="sticky z-20 text-left text-sm font-bold px-4 py-3 whitespace-nowrap"
                    style={{
                      left: SDR_COL_W,
                      width: CLIENT_COL_W,
                      minWidth: CLIENT_COL_W,
                      maxWidth: CLIENT_COL_W,
                      background: isDark ? "linear-gradient(to bottom, #1E293B, #162032)" : "#0F172A",
                      color: "#FFFFFF",
                      borderBottom: isDark ? "1px solid #334155" : "none",
                    }}
                  >
                    Client
                  </th>
                  <th
                    className="sticky z-20 text-center text-sm font-bold px-2 py-3 whitespace-nowrap"
                    style={{
                      left: SDR_COL_W + CLIENT_COL_W,
                      width: ATT_COL_W,
                      minWidth: ATT_COL_W,
                      maxWidth: ATT_COL_W,
                      background: isDark ? "linear-gradient(to bottom, #1E293B, #162032)" : "#0F172A",
                      color: "#FFFFFF",
                      borderRight: `2px solid ${isDark ? "#334155" : "#E2E8F0"}`,
                      borderBottom: isDark ? "1px solid #334155" : "none",
                    }}
                  >
                    {isHourMode ? format(dayDate, "EEE, d MMM") : "Days"}
                  </th>
                  {columnKeys.map((k) => (
                    <th
                      key={k}
                      className="text-sm font-bold px-2 py-3 text-center whitespace-nowrap"
                      style={{
                        width: cellWidth,
                        minWidth: cellWidth,
                        maxWidth: cellWidth,
                        background: isDark ? "linear-gradient(to bottom, #1E293B, #162032)" : "#0F172A",
                        color: "#FFFFFF",
                        borderBottom: isDark ? "1px solid #334155" : "none",
                      }}
                    >
                      {formatColumnHeader(k)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sdrs.map((sdr, idx) => {
                  const sdrClientInfo = sdrClientMap.get(sdr);
                  const sdrClient = sdrClientInfo ? clientLookup.get(sdrClientInfo.client_id) : null;
                  const displayClientName = sdrClient?.client_name || sdrClientInfo?.client_name || null;
                  const displayLogoUrl = sdrClient?.logo_url || null;
                  const rowBg = isDark
                    ? idx % 2 === 0
                      ? "#0f172a"
                      : "#1a2332"
                    : idx % 2 === 0
                      ? "#FFFFFF"
                      : "#F1F5F9";
                  const rowHover = isDark ? "#1e3a5f" : "#EFF6FF";
                  const textColor = isDark ? "#E2E8F0" : "#0F172A";
                  const borderColor = isDark ? "#334155" : "#E2E8F0";
                  const pill = attendancePill(sdr);
                  return (
                    <tr key={sdr} className="group transition-colors" style={{ backgroundColor: rowBg }}>
                      <td
                        className="sticky left-0 z-10 px-4 py-3 align-middle"
                        style={{
                          width: SDR_COL_W,
                          minWidth: SDR_COL_W,
                          maxWidth: SDR_COL_W,
                          backgroundColor: rowBg,
                          overflow: "hidden",
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = rowHover)}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = rowBg)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="flex-shrink-0 flex items-center justify-center rounded-full text-white font-bold"
                            style={{ width: 28, height: 28, fontSize: 10, backgroundColor: getAvatarColor(sdr) }}
                          >
                            {getInitials(sdr)}
                          </div>
                          <div className="text-sm font-medium leading-tight truncate" style={{ color: textColor }}>
                            {sdr}
                          </div>
                        </div>
                      </td>
                      <td
                        className="sticky z-10 px-4 py-3 align-middle"
                        style={{
                          left: SDR_COL_W,
                          width: CLIENT_COL_W,
                          minWidth: CLIENT_COL_W,
                          maxWidth: CLIENT_COL_W,
                          backgroundColor: rowBg,
                          overflow: "hidden",
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = rowHover)}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = rowBg)}
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
                            <span className="truncate text-sm" style={{ color: textColor }}>
                              {displayClientName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td
                        className="sticky z-10 px-2 py-3 align-middle"
                        style={{
                          left: SDR_COL_W + CLIENT_COL_W,
                          width: ATT_COL_W,
                          minWidth: ATT_COL_W,
                          maxWidth: ATT_COL_W,
                          backgroundColor: rowBg,
                          borderRight: `2px solid ${borderColor}`,
                          textAlign: "center",
                          overflow: "hidden",
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = rowHover)}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = rowBg)}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: 3,
                            background: pill.bg,
                            color: pill.color,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {pill.label}
                        </span>
                      </td>
                      {columnKeys.map((k) => {
                        const cell = cellMap.get(`${sdr}|${k}`);
                        const dials = cell?.dials || 0;
                        const sqls = cell?.sqls || 0;
                        const future = isFutureColumn(k);
                        const style = future ? FUTURE_CELL_STYLE : CELL_STYLES[intensityLevel(dials, isHourMode)];
                        // Dark mode overrides for zero and future cells
                        const cellBg =
                          isDark && intensityLevel(dials, isHourMode) === 0 && !future
                            ? "#1e293b"
                            : isDark && future
                              ? "#1e293b"
                              : style.bg;
                        const cellText =
                          isDark && (intensityLevel(dials, isHourMode) === 0 || future) ? "#475569" : style.text;
                        const cellBorder =
                          isDark && (intensityLevel(dials, isHourMode) === 0 || future)
                            ? "1px solid #334155"
                            : style.border;
                        return (
                          <td
                            key={k}
                            style={{
                              width: cellWidth,
                              minWidth: cellWidth,
                              maxWidth: cellWidth,
                              padding: 4,
                              backgroundColor: rowBg,
                            }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = rowHover)}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = rowBg)}
                          >
                            <div
                              className="relative rounded-md flex items-center justify-center text-xs font-semibold"
                              style={{
                                width: "100%",
                                minWidth: "100%",
                                height: CELL_H,
                                backgroundColor: cellBg,
                                color: cellText,
                                border: cellBorder,
                              }}
                              title={buildTooltip(sdr, k)}
                            >
                              {future ? <span>—</span> : dials}
                              {sqls > 0 && (
                                <span className="absolute leading-none" style={{ top: 3, right: 4, fontSize: 12 }}>
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
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
                title: "DM Conversations",
                value: summary.dms.toLocaleString(),
                subtitle: null,
                icon: MessageSquare,
                iconColor: "text-teal-500",
                iconBg: "bg-teal-500/10",
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
            ].map((card) => (
              <Card key={card.title} className="bg-card/50 backdrop-blur-sm border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <div className={cn("p-2 rounded-lg", card.iconBg)}>
                      <card.icon className={cn("h-5 w-5", card.iconColor)} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{card.value}</p>
                  {card.subtitle && <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

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
                      interval={columnKeys.length <= 7 ? 0 : columnKeys.length <= 15 ? 1 : 2}
                      angle={columnKeys.length > 10 ? -35 : 0}
                      textAnchor={columnKeys.length > 10 ? "end" : "middle"}
                      height={columnKeys.length > 10 ? 50 : 30}
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
                      content={({ active, payload, label }: any) => {
                        if (!active || !payload || !payload.length) return null;
                        const row = payload[0].payload as { dials: number; answered: number; dms: number };
                        return (
                          <div
                            style={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 8,
                              fontSize: 12,
                              padding: "6px 10px",
                              color: "hsl(var(--foreground))",
                            }}
                          >
                            {label} — {row.dials.toLocaleString()} dials · {row.answered.toLocaleString()} answered ·{" "}
                            {row.dms.toLocaleString()} DM conv.
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="dials" name="Dials" radius={[4, 4, 0, 0]} fill="#0f172a" />
                    <Bar dataKey="answered" name="Answered" radius={[4, 4, 0, 0]} fill="#475569" />
                    <Bar dataKey="dms" name="DM Conversations" radius={[4, 4, 0, 0]} fill="#94a3b8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <div className="text-muted-foreground font-medium">Total: {summary.dials.toLocaleString()} dials</div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#0f172a" }} />
                    <span>Dials</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#475569" }} />
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#94a3b8" }} />
                    <span>DM Conv.</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
