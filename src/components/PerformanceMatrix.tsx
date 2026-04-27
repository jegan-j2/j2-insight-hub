import { useEffect, useMemo, useState, useCallback } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, isSameDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ArrowUp, ArrowDown, ArrowUpDown, CalendarIcon, ChevronDown, Download, FileText, HelpCircle, Table2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { J2Loader } from "@/components/J2Loader";
import { useToast } from "@/hooks/use-toast";
import { useDateFilter, type FilterType } from "@/contexts/DateFilterContext";
import { toCSV, downloadCSV } from "@/lib/csvExport";
import * as XLSX from "xlsx-js-style";
import { useUserRole } from "@/hooks/useUserRole";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  Label,
} from "recharts";
import type { DateRange } from "react-day-picker";

// ─── Avatar helpers ───────────────────────────────────────────────
const AVATAR_COLORS = [
  "#0891b2",
  "#2563eb",
  "#9333ea",
  "#16a34a",
  "#ea580c",
  "#0d9488",
  "#4f46e5",
  "#e11d48",
  "#7c3aed",
  "#059669",
  "#d97706",
  "#db2777",
  "#0284c7",
  "#65a30d",
  "#c026d3",
  "#dc2626",
  "#0e7490",
  "#1d4ed8",
  "#7e22ce",
  "#047857",
];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % 20];
}
function getInitials(name: string): string {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : (p[0]?.[0] || "?").toUpperCase();
}

// ─── Quadrant helpers ─────────────────────────────────────────────
type Quadrant = "HOHC" | "LOHC" | "HOLC" | "LOLC";

const Q_COLORS: Record<Quadrant, string> = {
  HOHC: "#16a34a",
  LOHC: "#2563eb",
  HOLC: "#d97706",
  LOLC: "#dc2626",
};
const Q_BADGES: Record<Quadrant, { label: string; bg: string; color: string }> = {
  HOHC: { label: "HO HC", bg: "#dcfce7", color: "#166534" },
  LOHC: { label: "LO HC", bg: "#dbeafe", color: "#1e40af" },
  HOLC: { label: "HO LC", bg: "#fef9c3", color: "#854d0e" },
  LOLC: { label: "LO LC", bg: "#fee2e2", color: "#991b1b" },
};
const Q_LABELS: Record<Quadrant, string> = {
  HOHC: "Star performer",
  LOHC: "Coach quantity",
  HOLC: "Coach quality",
  LOLC: "At risk",
};

function getQuadrant(dials: number, conv: number, dialT: number, convT: number): Quadrant {
  const ho = dials >= dialT,
    hc = conv >= convT;
  if (ho && hc) return "HOHC";
  if (!ho && hc) return "LOHC";
  if (ho && !hc) return "HOLC";
  return "LOLC";
}

// ─── Types ────────────────────────────────────────────────────────
interface LeaderboardRow {
  name: string;
  clientId: string;
  totalDials: number;
  totalSQLs: number;
  conversionRate: number; // already a % e.g. 0.99
}

interface SDRPoint {
  name: string;
  client: string;
  dials: number;
  sqls: number;
  conv: number; // percentage e.g. 0.99
  q: Quadrant;
}

interface ClientOption {
  client_id: string;
  client_name: string;
  logo_url: string | null;
  campaign_start: string | null;
  campaign_end: string | null;
}

// ─── Custom scatter dot with initials ─────────────────────────────
const SDRDot = (props: any) => {
  const { cx, cy, payload, dimmed } = props;
  if (!cx || !cy) return null;
  const color = Q_COLORS[payload.q as Quadrant];
  const initials = getInitials(payload.name);
  return (
    <g opacity={dimmed ? 0.2 : 1}>
      <circle cx={cx} cy={cy} r={14} fill={color + "cc"} stroke={color} strokeWidth={1.5} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={9} fontWeight={700}>
        {initials}
      </text>
    </g>
  );
};

// ─── Custom tooltip ───────────────────────────────────────────────
const MatrixTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d: SDRPoint = payload[0].payload;
  const b = Q_BADGES[d.q];
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-md min-w-[170px]">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
          style={{ fontSize: 9, backgroundColor: avatarColor(d.name) }}
        >
          {getInitials(d.name)}
        </div>
        <span className="font-medium text-sm text-foreground">{d.name}</span>
      </div>
      <div className="space-y-1 text-muted-foreground">
        <div className="flex justify-between gap-4">
          <span>Dials</span>
          <span className="font-medium text-foreground">{d.dials.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>SQLs</span>
          <span className="font-medium text-foreground">{d.sqls}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Conv %</span>
          <span className="font-medium text-foreground">{d.conv.toFixed(2)}%</span>
        </div>
      </div>
      <span
        className="inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded"
        style={{ background: b.bg, color: b.color }}
      >
        {b.label} - {Q_LABELS[d.q]}
      </span>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────
const PerformanceMatrix = () => {
  const { toast } = useToast();
  const { isSdr, isClient } = useUserRole();

  // Block SDR and Client roles
  if (isSdr || isClient) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        You don't have access to this page.
      </div>
    );
  }

  // ── Date filter state ──────────────────────────────────────────
  type Filter = "last7days" | "last30days" | "thisMonth" | "lastMonth" | "campaign" | "custom";
  const [filterType, setFilterType] = useState<Filter>("thisMonth");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);

  // ── Clients ────────────────────────────────────────────────────
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientFilter, setClientFilter] = useState<string>("all");

  useEffect(() => {
    supabase
      .from("clients")
      .select("client_id, client_name, logo_url, campaign_start, campaign_end")
      .eq("status", "active")
      .order("client_name")
      .then(({ data }) => {
        if (data) setClients(data);
      });
  }, []);

  const selectedClient = useMemo(
    () => clients.find((c) => c.client_id === clientFilter) || null,
    [clientFilter, clients],
  );

  const showCampaignFilter = !!selectedClient?.campaign_start && !!selectedClient?.campaign_end;

  // ── Thresholds (applied on click) ─────────────────────────────
  const [dialTarget, setDialTarget] = useState(100);
  const [convTarget, setConvTarget] = useState(1.5);
  const [pendingDial, setPendingDial] = useState(100);
  const [pendingConv, setPendingConv] = useState(1.5);

  const applyThresholds = useCallback(() => {
    setDialTarget(pendingDial);
    setConvTarget(pendingConv);
  }, [pendingDial, pendingConv]);

  // ── Data ───────────────────────────────────────────────────────
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [qFilter, setQFilter] = useState<Quadrant | "all">("all");
  type SortField = "name" | "client" | "dials" | "sqls" | "conv" | "vsDial" | "vsConv" | "q";
  type SortDir = "asc" | "desc";
  const [sortField, setSortField] = useState<SortField>("dials");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const handleSort = (f: SortField) => {
    if (sortField === f) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(f);
      setSortDir(f === "dials" || f === "sqls" || f === "conv" || f === "vsDial" || f === "vsConv" ? "desc" : "asc");
    }
  };
  const [helpOpen, setHelpOpen] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_team_leaderboard", {
        p_start_date: format(dateRange.from, "yyyy-MM-dd") + "T00:00:00+11:00",
        p_end_date: format(dateRange.to, "yyyy-MM-dd") + "T23:59:59+11:00",
        p_client_id: clientFilter === "all" ? null : clientFilter,
      } as any);
      if (error) {
        console.error(error);
      } else {
        setRawData((data || []) as any[]);
      }
    } finally {
      setLoading(false);
    }
  }, [dateRange, clientFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Compute points ─────────────────────────────────────────────
  const points: SDRPoint[] = useMemo(
    () =>
      rawData
        .filter((r: any) => Number(r.total_dials) > 0)
        .map((r: any) => {
          const dials = Number(r.total_dials) || 0;
          const sqls = Number(r.sqls) || 0;
          const conv = dials > 0 ? parseFloat(((sqls / dials) * 100).toFixed(2)) : 0;
          return {
            name: r.sdr_name || r.name || "",
            client: r.client_id || "",
            dials,
            sqls,
            conv,
            q: getQuadrant(dials, conv, dialTarget, convTarget),
          };
        }),
    [rawData, dialTarget, convTarget],
  );

  const filteredPoints = useMemo(
    () => (qFilter === "all" ? points : points.filter((p) => p.q === qFilter)),
    [points, qFilter],
  );

  const filteredNames = useMemo(() => new Set(filteredPoints.map((p) => p.name)), [filteredPoints]);

  // ── Stats ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const counts = { HOHC: 0, LOHC: 0, HOLC: 0, LOLC: 0 };
    points.forEach((p) => counts[p.q]++);
    const n = points.length || 1;
    const avgConv = points.length ? points.reduce((s, p) => s + p.conv, 0) / points.length : 0;
    const hitO = points.filter((p) => p.dials >= dialTarget).length;
    const hitC = points.filter((p) => p.conv >= convTarget).length;
    return { counts, n, avgConv, hitO, hitC };
  }, [points, dialTarget, convTarget]);

  // ── Axis max ───────────────────────────────────────────────────
  const maxDials = useMemo(
    () => Math.max(...points.map((p) => p.dials), dialTarget * 1.5) * 1.15,
    [points, dialTarget],
  );
  const maxConv = useMemo(() => {
    const dataMax = points.length > 0 ? Math.max(...points.map((p) => p.conv)) : convTarget;
    return dataMax + 0.3;
  }, [points, convTarget]);

  // 95th percentile cap for X axis — prevents outliers like PE (50%+ conv) squishing everyone else
  const xAxisMax = useMemo(() => {
    if (points.length === 0) return 5;
    const sorted = [...points].map((p) => p.conv).sort((a, b) => a - b);
    const p95idx = Math.floor(sorted.length * 0.95);
    const p95val = sorted[Math.min(p95idx, sorted.length - 1)];
    // If the outlier is more than 3x the median, cap at p95 * 1.3, else use normal maxConv
    const median = sorted[Math.floor(sorted.length / 2)];
    const hasOutlier = p95val > median * 2.5;
    return hasOutlier ? p95val * 1.3 : maxConv;
  }, [points, maxConv]);

  // ── Export ─────────────────────────────────────────────────────
  const buildExportRows = useCallback(() => {
    const headers = [
      "SDR",
      "Client",
      "Dials",
      "SQLs",
      "Conv %",
      "vs Dial target",
      "vs Conv target",
      "Quadrant",
      "Action",
    ];
    const rows = filteredPoints
      .sort((a, b) => b.dials - a.dials)
      .map((p) => {
        const b = Q_BADGES[p.q];
        return [
          p.name,
          p.client,
          p.dials,
          p.sqls,
          p.conv.toFixed(2) + "%",
          (p.dials - dialTarget >= 0 ? "+" : "") + (p.dials - dialTarget),
          (p.conv - convTarget >= 0 ? "+" : "") + (p.conv - convTarget).toFixed(2) + "%",
          b.label,
          Q_LABELS[p.q],
        ];
      });
    return { headers, rows };
  }, [filteredPoints, dialTarget, convTarget]);

  const handleExportCSV = useCallback(() => {
    setExportingCSV(true);
    try {
      const { headers, rows } = buildExportRows();
      downloadCSV(toCSV(headers, rows), `j2-performance-matrix-${format(new Date(), "yyyy-MM-dd")}.csv`);
      toast({ title: "CSV exported successfully", className: "border-[#10b981]" });
    } finally {
      setExportingCSV(false);
    }
  }, [buildExportRows, toast]);

  const handleExportExcel = useCallback(() => {
    setExportingExcel(true);
    try {
      const { headers, rows } = buildExportRows();
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" }, name: "Arial", sz: 11 },
        fill: { fgColor: { rgb: "0F172A" } },
      };
      const evenRow = { fill: { fgColor: { rgb: "F1F5F9" } } };
      const oddRow = { fill: { fgColor: { rgb: "FFFFFF" } } };
      const allRows = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(allRows);
      ws["!cols"] = [
        { wch: 22 },
        { wch: 16 },
        { wch: 10 },
        { wch: 8 },
        { wch: 10 },
        { wch: 14 },
        { wch: 14 },
        { wch: 10 },
        { wch: 18 },
      ];
      allRows.forEach((_, i) => {
        const style = i === 0 ? headerStyle : i % 2 === 0 ? evenRow : oddRow;
        headers.forEach((__, c) => {
          const cell = XLSX.utils.encode_cell({ r: i, c });
          if (ws[cell]) ws[cell].s = style;
        });
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Performance Matrix");
      XLSX.writeFile(wb, `j2-performance-matrix-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast({ title: "Excel exported successfully", className: "border-[#10b981]" });
    } catch (err) {
      toast({ title: "Export failed", description: String(err), variant: "destructive" });
    } finally {
      setExportingExcel(false);
    }
  }, [buildExportRows, toast]);

  // ── Dark mode detection ────────────────────────────────────────
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains("dark")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const axisColor = isDark ? "#475569" : "#94a3b8";
  const refColor = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)";

  if (loading && rawData.length === 0) return <J2Loader />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Performance Matrix</h1>
          <p className="text-muted-foreground mb-3">Plot every SDR by output volume and SQL conversion quality</p>
        </div>
        {/* Quadrant help — top right */}
        <div className="flex-shrink-0">
          <button
            onClick={() => setHelpOpen((v) => !v)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border/50 rounded-lg px-3 py-2 bg-card hover:bg-muted/30"
          >
            <HelpCircle className="h-4 w-4" />
            What do the quadrants mean?
            <ChevronDown className={cn("h-3 w-3 transition-transform", helpOpen && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* Quadrant help panel — below header when open */}
      {helpOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              q: "HOHC" as Quadrant,
              title: "HO HC - Star performer",
              body: "High dials, high conversion. Your best people. Consistent activity and quality SQLs.",
              action: "Reinforce and scale. Recognise their work.",
              bg: "#f0fdf4",
              border: "#86efac",
              titleColor: "#166534",
              actionColor: "#16a34a",
            },
            {
              q: "LOHC" as Quadrant,
              title: "LO HC - Coach quantity",
              body: "Low dials but high conversion. Has the skill but isn't doing enough of it.",
              action: "Address motivation, time management, or blockers.",
              bg: "#eff6ff",
              border: "#93c5fd",
              titleColor: "#1e40af",
              actionColor: "#2563eb",
            },
            {
              q: "HOLC" as Quadrant,
              title: "HO LC - Coach quality",
              body: "High dials, low conversion. Working hard but quality is poor. SQLs getting rejected.",
              action: "Review calls together. Coach SQL quality. Set a timeframe.",
              bg: "#fefce8",
              border: "#fde047",
              titleColor: "#854d0e",
              actionColor: "#d97706",
            },
            {
              q: "LOLC" as Quadrant,
              title: "LO LC - At risk",
              body: "Low dials and low conversion. Not doing the work and the work they do is poor.",
              action: "Replace quickly. Use the recruitment pipeline.",
              bg: "#fef2f2",
              border: "#fca5a5",
              titleColor: "#991b1b",
              actionColor: "#dc2626",
            },
          ].map((h) => (
            <div
              key={h.q}
              className="rounded-lg p-3 border text-sm"
              style={{ background: h.bg, borderColor: h.border }}
            >
              <p className="font-medium mb-1" style={{ color: h.titleColor }}>
                {h.title}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">{h.body}</p>
              <p className="text-xs italic" style={{ color: h.actionColor }}>
                {h.action}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter row ── */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Date filters */}
          {[
            { label: "Last 7 Days", type: "last7days" as Filter, from: subDays(new Date(), 7), to: new Date() },
            { label: "Last 30 Days", type: "last30days" as Filter, from: subDays(new Date(), 30), to: new Date() },
            {
              label: "This Month",
              type: "thisMonth" as Filter,
              from: startOfMonth(new Date()),
              to: endOfMonth(new Date()),
            },
            {
              label: "Last Month",
              type: "lastMonth" as Filter,
              from: startOfMonth(subMonths(new Date(), 1)),
              to: endOfMonth(subMonths(new Date(), 1)),
            },
          ].map((f) => {
            const active = filterType === f.type && isSameDay(dateRange.from, f.from) && isSameDay(dateRange.to, f.to);
            return (
              <Button
                key={f.type}
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setDateRange({ from: f.from, to: f.to });
                  setFilterType(f.type);
                  setCustomRange(undefined);
                }}
                className={cn(
                  "transition-all duration-200 min-h-[40px] active:scale-95 text-xs sm:text-sm",
                  active
                    ? "bg-[#0f172a] hover:bg-[#0f172a] text-white font-semibold shadow-sm dark:bg-white dark:hover:bg-white dark:text-[#0f172a]"
                    : "bg-transparent text-muted-foreground border border-border hover:bg-muted/50 hover:text-foreground",
                )}
              >
                {f.label}
              </Button>
            );
          })}

          {/* Campaign filter */}
          {showCampaignFilter &&
            (() => {
              const cs = new Date(selectedClient!.campaign_start! + "T00:00:00");
              const ce = new Date(selectedClient!.campaign_end! + "T00:00:00");
              const active = filterType === "campaign";
              return (
                <Button
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setDateRange({ from: cs, to: ce });
                    setFilterType("campaign");
                    setCustomRange(undefined);
                  }}
                  className={cn(
                    "transition-all duration-200 min-h-[40px] active:scale-95 text-xs sm:text-sm",
                    active
                      ? "bg-[#0f172a] hover:bg-[#0f172a] text-white font-semibold shadow-sm dark:bg-white dark:hover:bg-white dark:text-[#0f172a]"
                      : "bg-transparent text-muted-foreground border border-border hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  Campaign
                </Button>
              );
            })()}

          {/* Custom range */}
          <Popover open={customPopoverOpen} onOpenChange={setCustomPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={filterType === "custom" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "transition-all duration-200 min-h-[40px] active:scale-95 text-xs sm:text-sm",
                  filterType === "custom"
                    ? "bg-[#0f172a] hover:bg-[#0f172a] text-white font-semibold shadow-sm dark:bg-white dark:hover:bg-white dark:text-[#0f172a]"
                    : "bg-transparent text-muted-foreground border border-border hover:bg-muted/50 hover:text-foreground",
                )}
              >
                Custom <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-border z-[100]" align="start" sideOffset={8}>
              <Calendar
                initialFocus
                mode="range"
                selected={customRange}
                onSelect={(range) => {
                  setCustomRange(range);
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                    setFilterType("custom");
                    setCustomPopoverOpen(false);
                  }
                }}
                numberOfMonths={2}
                className="pointer-events-auto p-3"
              />
            </PopoverContent>
          </Popover>

          {/* Export — right-aligned in filter row */}
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  disabled={loading || points.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100 font-medium text-sm transition-colors disabled:opacity-50 min-h-[40px]"
                >
                  <Download className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-4 w-4" />
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

        {/* Date range display */}
        {dateRange.from && dateRange.to && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>
              {format(dateRange.from, "MMM dd, yyyy")} – {format(dateRange.to, "MMM dd, yyyy")}
              {filterType === "campaign" ? " (Campaign)" : ""}
            </span>
          </div>
        )}
      </div>

      {/* ── Threshold controls + client filter ── */}
      <style>{`
        .j2-slider { -webkit-appearance: none; appearance: none; height: 4px; border-radius: 2px; outline: none; cursor: pointer; }
        .j2-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #0f172a; cursor: pointer; box-shadow: 0 0 0 2px #fff, 0 0 0 3px #0f172a; }
        .j2-slider::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: #0f172a; cursor: pointer; border: 2px solid #fff; }
        .dark .j2-slider::-webkit-slider-thumb { background: #f1f5f9; box-shadow: 0 0 0 2px #1e293b, 0 0 0 3px #f1f5f9; }
        .dark .j2-slider::-moz-range-thumb { background: #f1f5f9; border-color: #1e293b; }
        .j2-num-input { width: 64px; border: 1px solid hsl(var(--border)); border-radius: 6px; padding: 2px 6px; font-size: 13px; font-weight: 500; background: hsl(var(--background)); color: hsl(var(--foreground)); text-align: right; outline: none; }
        .j2-num-input:focus { border-color: #0f172a; }
      `}</style>
      <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3 p-4 bg-card border border-border rounded-lg">
        <span className="text-sm font-medium text-foreground flex-shrink-0">Thresholds</span>
        <div className="w-px h-5 bg-border flex-shrink-0 hidden md:block" />

        {/* Dial target */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span
            className="text-sm text-muted-foreground cursor-help flex items-center gap-1 whitespace-nowrap"
            title="Total dials made in the selected period"
          >
            Dial target
            <span className="text-xs text-muted-foreground/60">ⓘ</span>
          </span>
          <input
            type="range"
            min={10}
            max={Math.max(Math.ceil((maxDials || 3000) * 0.9), 500)}
            value={pendingDial}
            step={10}
            onChange={(e) => setPendingDial(Number(e.target.value))}
            className="j2-slider flex-1 md:flex-none md:w-28"
            style={(() => {
              const max = Math.max(Math.ceil((maxDials || 3000) * 0.9), 500);
              const pct = ((pendingDial - 10) / (max - 10)) * 100;
              const fill = isDark ? "#e2e8f0" : "#0f172a";
              const track = isDark ? "#334155" : "#cbd5e1";
              return { background: `linear-gradient(to right, ${fill} ${pct}%, ${track} ${pct}%)` };
            })()}
          />
          <input
            type="number"
            min={10}
            max={Math.max(Math.ceil((maxDials || 3000) * 0.9), 500)}
            step={10}
            value={pendingDial}
            onChange={(e) => setPendingDial(Math.max(10, Number(e.target.value)))}
            className="j2-num-input"
          />
          <span className="text-sm text-muted-foreground">dials</span>
        </div>

        <div className="w-px h-5 bg-border flex-shrink-0 hidden md:block" />

        {/* Conv % target */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span
            className="text-sm text-muted-foreground cursor-help flex items-center gap-1 whitespace-nowrap"
            title="SQLs ÷ Total Dials × 100"
          >
            Conv % target
            <span className="text-xs text-muted-foreground/60">ⓘ</span>
          </span>
          <input
            type="range"
            min={0.1}
            max={Math.max((maxConv || 5) * 0.9, 5)}
            value={pendingConv}
            step={0.1}
            onChange={(e) => setPendingConv(parseFloat(Number(e.target.value).toFixed(1)))}
            className="j2-slider flex-1 md:flex-none md:w-28"
            style={(() => {
              const max = Math.max((maxConv || 5) * 0.9, 5);
              const pct = ((pendingConv - 0.1) / (max - 0.1)) * 100;
              const fill = isDark ? "#e2e8f0" : "#0f172a";
              const track = isDark ? "#334155" : "#cbd5e1";
              return { background: `linear-gradient(to right, ${fill} ${pct}%, ${track} ${pct}%)` };
            })()}
          />
          <input
            type="number"
            min={0.1}
            max={Math.max((maxConv || 5) * 0.9, 5)}
            step={0.1}
            value={pendingConv}
            onChange={(e) => setPendingConv(Math.max(0.1, parseFloat(Number(e.target.value).toFixed(1))))}
            className="j2-num-input"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>

        <div className="w-px h-5 bg-border flex-shrink-0 hidden md:block" />

        {/* Apply button */}
        <button
          onClick={applyThresholds}
          className="px-4 py-1.5 rounded-lg bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100 font-medium text-sm transition-colors"
        >
          Apply
        </button>

        {/* Client filter — far right */}
        <div className="ml-auto">
          <Select
            value={clientFilter}
            onValueChange={(v) => {
              setClientFilter(v);
              setQFilter("all");
            }}
          >
            <SelectTrigger
              className={cn(
                "w-[180px] min-h-[36px] text-xs sm:text-sm rounded-md",
                "bg-[#0f172a] text-white border-[#0f172a] hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:border-white font-semibold",
              )}
            >
              <SelectValue placeholder="All Clients" />
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

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: "Star performers", value: stats.counts.HOHC, sub: "HO HC", valueColor: "#16a34a" },
          {
            label: "Needs coaching",
            value: stats.counts.LOHC + stats.counts.HOLC,
            sub: "LO HC + HO LC",
            valueColor: "#d97706",
          },
          { label: "At risk", value: stats.counts.LOLC, sub: "LO LC", valueColor: "#dc2626" },
          {
            label: "Team avg conv %",
            value: stats.avgConv.toFixed(2) + "%",
            sub: `vs ${convTarget.toFixed(1)}% target`,
            valueColor: undefined,
          },
          {
            label: "Hitting dial target (O)",
            value: `${stats.hitO}/${stats.n}`,
            sub: `${Math.round((stats.hitO / stats.n) * 100)}% of team`,
            valueColor: undefined,
          },
          {
            label: "Hitting conv target (C)",
            value: `${stats.hitC}/${stats.n}`,
            sub: `${Math.round((stats.hitC / stats.n) * 100)}% of team`,
            valueColor: undefined,
          },
        ].map((card) => (
          <Card key={card.label} className="bg-card/50 border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
              <p
                className="text-2xl font-bold text-foreground"
                style={card.valueColor ? { color: card.valueColor } : undefined}
              >
                {card.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Scatter chart ── */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Performance Scatter - Dials vs SQL Conversion %</h3>
        </div>
        <CardContent className="p-5">
          {loading ? (
            <div className="h-[460px] flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
          ) : points.length === 0 ? (
            <div className="h-[460px] flex items-center justify-center text-muted-foreground text-sm">
              No data for this period
            </div>
          ) : (
            <div className="h-[460px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 160, bottom: 40, left: 20 }}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="conv"
                    domain={[0, xAxisMax]}
                    tick={{ fontSize: 12, fill: isDark ? "#94a3b8" : "#475569", fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: gridColor }}
                    tickFormatter={(v) => (v === 0 ? "0%" : v.toFixed(1) + "%")}
                  >
                    <Label
                      value="Conv % →"
                      position="insideBottom"
                      offset={-20}
                      style={{ fontSize: 12, fill: isDark ? "#94a3b8" : "#475569", fontWeight: 500 }}
                    />
                  </XAxis>
                  <YAxis
                    type="number"
                    dataKey="dials"
                    domain={[0, maxDials]}
                    tick={{ fontSize: 12, fill: isDark ? "#94a3b8" : "#475569", fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: gridColor }}
                    tickFormatter={(v) => (v === 0 ? "0" : v >= 1000 ? Math.round(v / 100) / 10 + "k" : String(v))}
                  >
                    <Label
                      value="Dials →"
                      angle={-90}
                      position="insideLeft"
                      offset={10}
                      style={{
                        fontSize: 12,
                        fill: isDark ? "#94a3b8" : "#475569",
                        fontWeight: 500,
                        textAnchor: "middle",
                      }}
                    />
                  </YAxis>
                  <Tooltip content={<MatrixTooltip />} />
                  <ReferenceLine
                    x={convTarget}
                    stroke={refColor}
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                    label={{
                      value: `${convTarget.toFixed(1)}% conv target`,
                      position: "insideTopRight",
                      fontSize: 10,
                      fill: isDark ? "#64748b" : "#94a3b8",
                    }}
                  />
                  <ReferenceLine
                    y={dialTarget}
                    stroke={refColor}
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                    label={{
                      value: `${dialTarget.toLocaleString()} dial target`,
                      position: "insideTopRight",
                      fontSize: 10,
                      fill: isDark ? "#64748b" : "#94a3b8",
                    }}
                  />
                  <Scatter
                    data={points}
                    shape={(props: any) => (
                      <SDRDot {...props} dimmed={qFilter !== "all" && !filteredNames.has(props.payload.name)} />
                    )}
                  />
                </ScatterChart>
              </ResponsiveContainer>

              {/* Legend — inside chart top-right */}
              <div
                className="absolute top-4 right-4 rounded-lg border border-border px-3 py-2.5 space-y-1.5"
                style={{
                  background: isDark ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(4px)",
                }}
              >
                {(["HOHC", "LOHC", "HOLC", "LOLC"] as Quadrant[]).map((q) => {
                  const b = Q_BADGES[q];
                  const count = stats.counts[q];
                  return (
                    <div key={q} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: Q_COLORS[q] }} />
                      <span className="font-medium" style={{ color: b.color }}>
                        {b.label}
                      </span>
                      <span className="text-muted-foreground ml-auto pl-3">({count})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Quadrant filter + table ── */}
      <div>
        <div className="flex flex-wrap gap-2 mb-3 items-center px-4">
          {[
            { key: "all" as const, label: "All SDRs", bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
            { key: "HOHC" as const, label: "⭐ HO HC", bg: "#dcfce7", color: "#166534", border: "#86efac" },
            { key: "LOHC" as const, label: "📈 LO HC", bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
            { key: "HOLC" as const, label: "⚡ HO LC", bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
            { key: "LOLC" as const, label: "🔴 LO LC", bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
          ].map((btn) => (
            <button
              key={btn.key}
              onClick={() => setQFilter(btn.key)}
              className="text-xs font-medium px-3 py-1.5 rounded-full border transition-opacity"
              style={{
                background: btn.bg,
                color: btn.color,
                borderColor: btn.border,
                opacity: qFilter !== "all" && qFilter !== btn.key && btn.key !== "all" ? 0.3 : 1,
              }}
            >
              {btn.label}
            </button>
          ))}
          {/* Count badge — right-aligned, navy bg white text, same height as pills */}
          <span className="ml-auto mr-3 px-3 py-1.5 rounded-full text-xs font-medium bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a]">
            {filteredPoints.length} SDR{filteredPoints.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {[
                  { label: "SDR Name", align: "left", field: "name" as SortField },
                  { label: "Client", align: "left", field: "client" as SortField },
                  { label: "Dials", align: "center", field: "dials" as SortField },
                  { label: "SQLs", align: "center", field: "sqls" as SortField },
                  { label: "Conv %", align: "center", field: "conv" as SortField },
                  { label: "vs Dial target", align: "center", field: "vsDial" as SortField },
                  { label: "vs Conv % target", align: "center", field: "vsConv" as SortField },
                  { label: "Quadrant", align: "left", field: "q" as SortField },
                ].map((h) => {
                  const isActive = sortField === h.field;
                  const Icon = !isActive ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
                  return (
                    <th
                      key={h.label}
                      onClick={() => handleSort(h.field)}
                      className="px-4 py-3 text-sm font-bold whitespace-nowrap cursor-pointer select-none"
                      style={{
                        background: isDark ? "linear-gradient(to bottom, #1E293B, #162032)" : "#0F172A",
                        color: "#FFFFFF",
                        textAlign: h.align as any,
                        borderBottom: isDark ? "1px solid #334155" : "none",
                      }}
                    >
                      <span className={cn("inline-flex items-center", h.align === "center" && "justify-center")}>
                        {h.label}
                        <Icon
                          className={cn(
                            "ml-1 h-3 w-3 inline",
                            isActive ? "text-white" : "text-white/50",
                          )}
                        />
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredPoints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No SDRs in this quadrant
                  </td>
                </tr>
              ) : (
                [...filteredPoints]
                  .sort((a, b) => {
                    const dir = sortDir === "asc" ? 1 : -1;
                    switch (sortField) {
                      case "name":
                        return a.name.localeCompare(b.name) * dir;
                      case "client": {
                        const an = clients.find((c) => c.client_id === a.client)?.client_name || a.client;
                        const bn = clients.find((c) => c.client_id === b.client)?.client_name || b.client;
                        return an.localeCompare(bn) * dir;
                      }
                      case "dials":
                        return (a.dials - b.dials) * dir;
                      case "sqls":
                        return (a.sqls - b.sqls) * dir;
                      case "conv":
                        return (a.conv - b.conv) * dir;
                      case "vsDial":
                        return ((a.dials - dialTarget) - (b.dials - dialTarget)) * dir;
                      case "vsConv":
                        return ((a.conv - convTarget) - (b.conv - convTarget)) * dir;
                      case "q":
                        return a.q.localeCompare(b.q) * dir;
                      default:
                        return 0;
                    }
                  })
                  .map((p, idx) => {
                    const rowBg = isDark
                      ? idx % 2 === 0
                        ? "#0f172a"
                        : "#1a2332"
                      : idx % 2 === 0
                        ? "#FFFFFF"
                        : "#F1F5F9";
                    const rowHover = isDark ? "#1e3a5f" : "#EFF6FF";
                    const textCol = isDark ? "#E2E8F0" : "#0F172A";
                    const b = Q_BADGES[p.q];
                    const oDiff = p.dials - dialTarget;
                    const cDiff = parseFloat((p.conv - convTarget).toFixed(2));
                    const oColor = oDiff >= 0 ? "#16a34a" : "#dc2626";
                    const cColor = cDiff >= 0 ? "#16a34a" : "#dc2626";
                    // Client lookup for logo + name
                    const clientInfo = clients.find((c) => c.client_id === p.client);
                    const clientName = clientInfo?.client_name || p.client;
                    const clientLogo = clientInfo?.logo_url || null;
                    // Quadrant badge — dark mode uses stronger contrast
                    const badgeBg = isDark
                      ? p.q === "HOHC"
                        ? "#166534"
                        : p.q === "LOHC"
                          ? "#1e40af"
                          : p.q === "HOLC"
                            ? "#854d0e"
                            : "#991b1b"
                      : b.bg;
                    const badgeText = isDark ? "#ffffff" : b.color;
                    return (
                      <tr
                        key={p.name}
                        style={{ backgroundColor: rowBg }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = rowHover)}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = rowBg)}
                      >
                        {/* SDR Name */}
                        <td className="px-4 py-3" style={{ color: textCol }}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                              style={{ fontSize: 9, backgroundColor: avatarColor(p.name) }}
                            >
                              {getInitials(p.name)}
                            </div>
                            <span className="text-sm font-medium">{p.name}</span>
                          </div>
                        </td>
                        {/* Client logo + name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {clientLogo ? (
                              <img
                                src={clientLogo}
                                alt=""
                                className="w-4 h-4 rounded-sm object-contain flex-shrink-0"
                              />
                            ) : (
                              <span className="w-4 h-4 rounded-sm bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground flex-shrink-0">
                                {clientName.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <span className="text-sm" style={{ color: textCol }}>
                              {clientName}
                            </span>
                          </div>
                        </td>
                        {/* Numbers — centre-aligned, text-sm */}
                        <td className="px-4 py-3 text-sm text-center" style={{ color: textCol }}>
                          {p.dials.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-center" style={{ color: textCol }}>
                          {p.sqls}
                        </td>
                        <td className="px-4 py-3 text-sm text-center" style={{ color: textCol }}>
                          {p.conv.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-sm text-center" style={{ color: oColor }}>
                          {oDiff >= 0 ? "+" : ""}
                          {oDiff.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-center" style={{ color: cColor }}>
                          {cDiff >= 0 ? "+" : ""}
                          {cDiff.toFixed(2)}%
                        </td>
                        {/* Quadrant badge — dark mode aware */}
                        <td className="px-4 py-3">
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded"
                            style={{ background: badgeBg, color: badgeText }}
                          >
                            {b.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>

        {/* Distribution bar */}
        {points.length > 0 && (
          <div className="mt-4 p-4 bg-card border border-border rounded-lg">
            <p className="text-xs text-muted-foreground mb-2">
              Team distribution - {points.length} SDR{points.length !== 1 ? "s" : ""}
            </p>
            <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
              {(["HOHC", "LOHC", "HOLC", "LOLC"] as Quadrant[]).map(
                (q) =>
                  stats.counts[q] > 0 && (
                    <div
                      key={q}
                      className="h-full rounded-sm transition-all duration-300"
                      style={{ width: `${(stats.counts[q] / stats.n) * 100}%`, background: Q_COLORS[q] }}
                    />
                  ),
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-2">
              {(["HOHC", "LOHC", "HOLC", "LOLC"] as Quadrant[]).map((q) => (
                <div key={q} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full" style={{ background: Q_COLORS[q] }} />
                  {stats.counts[q]} {Q_LABELS[q]}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceMatrix;
