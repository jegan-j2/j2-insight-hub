import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { J2Loader } from "@/components/J2Loader";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import {
  Phone,
  PhoneIncoming,
  Percent,
  Target,
  CalendarIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  ChevronLeft,
  ChevronRight,
  Play,
  Square,
  Volume2,
  Handshake,
  Download,
  FileText,
  Table2,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/lib/supabase";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useDateFilter } from "@/contexts/DateFilterContext";
import {
  format,
  formatDistanceToNow,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  eachDayOfInterval,
  getDaysInMonth,
} from "date-fns";
import { cn } from "@/lib/utils";
import { SDRAvatar } from "@/components/SDRAvatar";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx-js-style";
import { toCSV, downloadCSV } from "@/lib/csvExport";
import { ACTIVE_SQL_MEETING_STATUSES, getRecordingUrlWithFallback } from "@/lib/sqlMeetings";
import { DemoMeetingsModal } from "@/components/DemoMeetingsModal";

type Mode = "live" | "historical";
type SortKey = "sdrName" | "clientId" | "dials" | "answered" | "conversations" | "answerRate" | "sqls" | "conversion";
type SortDir = "asc" | "desc";
type DrillMetric = "answered" | "sqls" | "conversations";
type DateMode = "day" | "week" | "month";
type WeekDay = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
type AllDay = WeekDay | "Saturday" | "Sunday";

interface SqlMeetingRow {
  id: string;
  sdr_name: string | null;
  client_id: string | null;
  contact_person: string;
  company_name: string | null;
  booking_date: string;
  meeting_date: string | null;
  meeting_time: string | null;
  meeting_status: string | null;
  client_notes: string | null;
  created_at: string | null;
  hubspot_engagement_id?: string | null;
  recording_url?: string | null;
  call_duration?: number | null;
  activity_date?: string | null;
}

interface SnapshotRow {
  sdr_name: string | null;
  client_id: string | null;
  dials: number | null;
  answered: number | null;
  dms_reached: number | null;
  sqls: number | null;
  answer_rate: number | null;
}

interface ActivityRow {
  id: string;
  sdr_name: string | null;
  activity_date: string;
  contact_name: string | null;
  company_name: string | null;
  call_outcome: string | null;
  call_duration: number | null;
  activity_type: string | null;
  is_sql: boolean | null;
  is_decision_maker: boolean | null;
  meeting_scheduled_date: string | null;
  client_id: string | null;
  recording_url: string | null;
  hubspot_engagement_id?: string | null;
}

interface SDRRow {
  sdrName: string;
  clientId: string;
  dials: number;
  answered: number;
  conversations: number;
  answerRate: number;
  sqls: number;
  conversion: number;
  lastActivity: Date | null;
  demoBooked?: number;
  demoAttended?: number;
}

const formatHour = (h: number) => {
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
};

const buildDateOrFilter = (dates: string[], field: string) =>
  dates.map((d) => `and(${field}.gte.${d}T00:00:00,${field}.lte.${d}T23:59:59)`).join(",");

const getMelbourneToday = () => {
  const now = new Date();
  const melb = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = melb.find((p) => p.type === "year")!.value;
  const m = melb.find((p) => p.type === "month")!.value;
  const d = melb.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
};

const formatScheduledMeetingDateTime = (meetingDate: string | null, meetingTime: string | null) => {
  if (!meetingDate) return "-";

  const dateLabel = format(new Date(`${meetingDate}T00:00:00`), "d MMM yyyy");
  if (!meetingTime) return dateLabel;

  const isoAttempt = new Date(`${meetingDate}T${meetingTime}`);
  if (!Number.isNaN(isoAttempt.getTime())) {
    return format(isoAttempt, "d MMM yyyy, h:mm a");
  }

  const looseAttempt = new Date(`${meetingDate} ${meetingTime}`);
  if (!Number.isNaN(looseAttempt.getTime())) {
    return format(looseAttempt, "d MMM yyyy, h:mm a");
  }

  return `${dateLabel}, ${meetingTime}`;
};

const ALL_WEEKDAYS: WeekDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const ALL_DAYS: AllDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAY_MAP: Record<AllDay, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 0,
};

const ActivityMonitor = () => {
  const isMobile = useIsMobile();
  const { clientFilter, setClientFilter } = useDateFilter();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Initialise from URL params
  const initialMode = (searchParams.get("mode") === "historical" ? "historical" : "live") as Mode;
  const initialDateMode = (
    ["day", "week", "month"].includes(searchParams.get("dateMode") || "") ? searchParams.get("dateMode") : "day"
  ) as DateMode;
  const initialDate = (() => {
    const d = searchParams.get("date");
    if (d) {
      const p = new Date(d + "T00:00:00");
      if (!Number.isNaN(p.getTime())) return p;
    }
    return new Date();
  })();
  const initialStartHour = parseInt(searchParams.get("startHour") || "0", 10);
  const initialEndHour = parseInt(searchParams.get("endHour") || "24", 10);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("dials");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Drill-down
  const [drillDown, setDrillDown] = useState<{ sdrName: string; metric: DrillMetric } | null>(null);
  const [drillDownData, setDrillDownData] = useState<ActivityRow[]>([]);
  const [drillDownSqlData, setDrillDownSqlData] = useState<SqlMeetingRow[]>([]);
  const [loadingDrill, setLoadingDrill] = useState(false);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
  const [sdrPhotoMap, setSdrPhotoMap] = useState<Record<string, string | null>>({});
  const { refreshKey, manualRefresh } = useAutoRefresh(300000);
  const [clientNameMap, setClientNameMap] = useState<Record<string, string>>({});
  const [clientLogoMap, setClientLogoMap] = useState<Record<string, string | null>>({});
  const [allTeamMembers, setAllTeamMembers] = useState<
    { sdr_name: string; client_id: string; status: string | null }[]
  >([]);
  const [sdrPage, setSdrPage] = useState(0);
  const [drillPage, setDrillPage] = useState(0);
  const { toast } = useToast();
  const [latestSql, setLatestSql] = useState<{
    sdrName: string;
    companyName: string;
    clientId: string;
    createdAt: string;
  } | null>(null);
  const [clientOptions, setClientOptions] = useState<
    { client_id: string; client_name: string; logo_url: string | null }[]
  >([]);

  const [demoModalSdr, setDemoModalSdr] = useState<{ sdrName: string; dateRange: { from: Date; to: Date } } | null>(
    null,
  );
  const [demoCounts, setDemoCounts] = useState<Map<string, { demo_booked: number; demo_attended: number }>>(new Map());
  const isPexa = clientFilter === "pexa-clear";

  const SDR_PAGE_SIZE = 15;
  const DRILL_PAGE_SIZE = 15;

  const activeClientFilter = clientFilter && clientFilter !== "all" ? clientFilter : null;

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchPhotosAndMembers = async () => {
      const { data: allMembers } = await supabase
        .from("team_members")
        .select("sdr_name, profile_photo_url, client_id, role");
      if (allMembers) {
        const photoMap: Record<string, string | null> = {};
        for (const m of allMembers) {
          photoMap[m.sdr_name] = m.profile_photo_url;
        }
        setSdrPhotoMap(photoMap);
      }

      const { data: members } = await supabase
        .from("team_members")
        .select("sdr_name, client_id, role, status")
        .eq("role", "SDR")
        .not("client_id", "eq", "admin")
        .not("client_id", "is", null);
      setAllTeamMembers(members || []);

      const { data: clients } = await supabase
        .from("clients")
        .select("client_id, client_name, logo_url, status")
        .order("client_name");
      if (clients) {
        const map: Record<string, string> = {};
        const logoMap: Record<string, string | null> = {};
        for (const c of clients) {
          map[c.client_id] = c.client_name;
          logoMap[c.client_id] = c.logo_url;
        }
        setClientNameMap(map);
        setClientLogoMap(logoMap);
        setClientOptions(
          clients
            .filter((c) => c.status === "active")
            .map((c) => ({ client_id: c.client_id, client_name: c.client_name, logo_url: c.logo_url })),
        );
      }
    };
    fetchPhotosAndMembers();
  }, []);

  const handleExportCSV = () => {
    const dateStr = mode === "live" ? todayMelbourne : format(histDate, "yyyy-MM-dd");
    const headers = [
      "SDR Name",
      "Client",
      "Dials",
      "Answered",
      "Answer Rate",
      "DM Conversations",
      "SQLs",
      "Conversion Rate",
    ];
    const rows = sdrRows
      .filter((r) => r.dials > 0)
      .map((r) => [
        r.sdrName,
        clientNameMap[r.clientId] || r.clientId,
        r.dials,
        r.answered,
        r.answerRate.toFixed(1) + "%",
        r.conversations,
        r.sqls,
        r.conversion.toFixed(1) + "%",
      ]);
    downloadCSV(toCSV(headers, rows), `j2-activity-${dateStr}.csv`);
    toast({ title: "CSV exported successfully", className: "border-[#10b981]" });
  };

  const handleExportExcel = () => {
    try {
      const dateStr = mode === "live" ? todayMelbourne : format(histDate, "yyyy-MM-dd");
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" }, name: "Arial", sz: 11 },
        fill: { fgColor: { rgb: "0F172A" } },
      };
      const evenRow = { fill: { fgColor: { rgb: "F1F5F9" } } };
      const oddRow = { fill: { fgColor: { rgb: "FFFFFF" } } };

      // Sheet 1 — KPI Summary
      const kpiData = [
        ["Metric", "Value"],
        ["Total Dials", totals.dials],
        ["Total Answered", totals.answered],
        ["Answer Rate", answerRateDisplay],
        ["DM Conversations", totals.conversations],
        ["Total SQLs", totals.sqls],
        ["Date", mode === "live" ? todayFormatted : dateRangeInfo.label],
      ];
      const kpiSheet = XLSX.utils.aoa_to_sheet(kpiData);
      kpiSheet["!cols"] = [{ wch: 24 }, { wch: 20 }];
      kpiData.forEach((_, i) => {
        const rowStyle = i === 0 ? headerStyle : i % 2 === 0 ? evenRow : oddRow;
        const cell1 = XLSX.utils.encode_cell({ r: i, c: 0 });
        const cell2 = XLSX.utils.encode_cell({ r: i, c: 1 });
        if (kpiSheet[cell1]) kpiSheet[cell1].s = rowStyle;
        if (kpiSheet[cell2]) kpiSheet[cell2].s = rowStyle;
      });

      // Sheet 2 — SDR Performance
      const sdrHeaders = [
        "SDR Name",
        "Client",
        "Dials",
        "Answered",
        "Answer Rate",
        "DM Conversations",
        "SQLs",
        "Conversion Rate",
      ];
      const sdrData = [
        sdrHeaders,
        ...sdrRows
          .filter((r) => r.dials > 0)
          .map((r) => [
            r.sdrName,
            clientNameMap[r.clientId] || r.clientId,
            r.dials,
            r.answered,
            r.answerRate.toFixed(1) + "%",
            r.conversations,
            r.sqls,
            r.conversion.toFixed(1) + "%",
          ]),
      ];
      const sdrSheet = XLSX.utils.aoa_to_sheet(sdrData);
      sdrSheet["!cols"] = [
        { wch: 22 },
        { wch: 20 },
        { wch: 10 },
        { wch: 12 },
        { wch: 14 },
        { wch: 20 },
        { wch: 10 },
        { wch: 18 },
      ];
      sdrData.forEach((_, i) => {
        const rowStyle = i === 0 ? headerStyle : i % 2 === 0 ? evenRow : oddRow;
        sdrHeaders.forEach((__, c) => {
          const cell = XLSX.utils.encode_cell({ r: i, c });
          if (sdrSheet[cell]) sdrSheet[cell].s = rowStyle;
        });
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, kpiSheet, "KPI Summary");
      XLSX.utils.book_append_sheet(wb, sdrSheet, "SDR Performance");
      XLSX.writeFile(wb, `j2-activity-${dateStr}.xlsx`);
      toast({ title: "Excel exported successfully", className: "border-[#10b981]" });
    } catch (err) {
      toast({ title: "Export failed", description: String(err), variant: "destructive" });
    }
  };

  // Historical filters
  const [histDate, setHistDate] = useState<Date>(initialDate);
  const [timeRange, setTimeRange] = useState<number[]>([initialStartHour, initialEndHour]);
  const [selectedWeekdays, setSelectedWeekdays] = useState<AllDay[]>([...ALL_WEEKDAYS]);
  const [histApplied, setHistApplied] = useState(false);
  const [histSqlMeetings, setHistSqlMeetings] = useState<SqlMeetingRow[]>([]);
  const [dateMode, setDateMode] = useState<DateMode>(initialDateMode);
  const pillsRef = useRef<HTMLDivElement>(null);
  const [pillsWidth, setPillsWidth] = useState(0);

  const todayMelbourne = useMemo(getMelbourneToday, []);
  const todayFormatted = useMemo(() => {
    const d = new Date(todayMelbourne + "T00:00:00");
    return format(d, "EEEE, MMMM d, yyyy");
  }, [todayMelbourne]);

  // Compute date range based on dateMode, filtered by selected weekdays
  const dateRangeInfo = useMemo(() => {
    const filterByWeekdays = (days: Date[]) => {
      if (dateMode === "day") return days;
      const selectedDayNumbers = selectedWeekdays.map((d) => WEEKDAY_MAP[d]);
      return days.filter((d) => {
        const dow = d.getDay(); // 0=Sun, 1=Mon...
        return selectedDayNumbers.includes(dow);
      });
    };

    if (dateMode === "day") {
      const dateStr = format(histDate, "yyyy-MM-dd");
      return { dates: [dateStr], label: format(histDate, "EEEE, MMM d, yyyy") };
    } else if (dateMode === "week") {
      const weekStart = startOfWeek(histDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(histDate, { weekStartsOn: 1 });
      const days = filterByWeekdays(eachDayOfInterval({ start: weekStart, end: weekEnd }));
      return {
        dates: days.map((d) => format(d, "yyyy-MM-dd")),
        label: `${format(weekStart, "EEE, MMM d")} – ${format(weekEnd, "EEE, MMM d, yyyy")}`,
      };
    } else {
      const monthStart = startOfMonth(histDate);
      const monthEnd = endOfMonth(histDate);
      const days = filterByWeekdays(eachDayOfInterval({ start: monthStart, end: monthEnd }));
      const totalDays = getDaysInMonth(histDate);
      return {
        dates: days.map((d) => format(d, "yyyy-MM-dd")),
        label: `${format(monthStart, "MMM d")} – ${format(monthEnd, "MMM d, yyyy")} · ${totalDays} days`,
      };
    }
  }, [histDate, dateMode, selectedWeekdays]);

  const fetchLatestSqlLive = useCallback(async () => {
    let query = supabase
      .from("sql_meetings")
      .select("sdr_name, company_name, client_id, created_at, booking_date")
      .in("meeting_status", [...ACTIVE_SQL_MEETING_STATUSES])
      .eq("booking_date", todayMelbourne)
      .order("created_at", { ascending: false })
      .limit(1);
    if (activeClientFilter) query = query.eq("client_id", activeClientFilter);
    const { data } = await query;
    setLatestSql(
      data?.[0]
        ? {
            sdrName: data[0].sdr_name || "",
            companyName: data[0].company_name || "",
            clientId: data[0].client_id || "",
            createdAt: data[0].created_at,
          }
        : null,
    );
  }, [todayMelbourne, activeClientFilter]);

  // LIVE fetch
  const fetchLiveData = useCallback(async () => {
    if (mode !== "live") return;
    setLoading(true);
    try {
      const activityCols =
        "id, sdr_name, activity_date, contact_name, company_name, call_outcome, call_duration, activity_type, is_sql, is_decision_maker, meeting_scheduled_date, client_id, recording_url";

      const [liveActivities, liveSqls] = await Promise.all([
        fetchAllRows<ActivityRow>(
          "activity_log",
          activityCols,
          (q: any) => {
            let filtered = q
              .gte("activity_date", todayMelbourne + "T00:00:00")
              .lte("activity_date", todayMelbourne + "T23:59:59");
            if (activeClientFilter) filtered = filtered.eq("client_id", activeClientFilter);
            return filtered;
          },
          "activity_date",
        ),
        (async () => {
          let sqlQ = supabase
            .from("sql_meetings")
            .select("sdr_name, client_id, meeting_status")
            .in("meeting_status", [...ACTIVE_SQL_MEETING_STATUSES])
            .eq("booking_date", todayMelbourne);
          if (activeClientFilter) sqlQ = sqlQ.eq("client_id", activeClientFilter);
          const { data } = await sqlQ;
          return data || [];
        })(),
      ]);

      setActivities(liveActivities);
      setHistSqlMeetings(liveSqls as any);
    } catch (err) {
      console.error("Error fetching live data:", err);
    } finally {
      setLoading(false);
    }
  }, [todayMelbourne, mode, activeClientFilter]);

  // Helper to fetch all rows with pagination (bypasses 1000-row default limit)
  const fetchAllRows = async <T,>(
    tableName: string,
    selectCols: string,
    filters: (query: any) => any,
    orderCol?: string,
  ): Promise<T[]> => {
    const PAGE_SIZE = 1000;
    let allData: T[] = [];
    let from = 0;
    let hasMore = true;
    while (hasMore) {
      let query = supabase
        .from(tableName)
        .select(selectCols)
        .range(from, from + PAGE_SIZE - 1);
      query = filters(query);
      if (orderCol) query = query.order(orderCol, { ascending: false });
      const { data, error } = await query;
      if (error) {
        console.error(`Fetch error ${tableName}:`, error);
        break;
      }
      if (data) allData = allData.concat(data as T[]);
      hasMore = (data?.length || 0) === PAGE_SIZE;
      from += PAGE_SIZE;
    }
    return allData;
  };

  // HISTORICAL fetch — query activity_log and sql_meetings directly
  const fetchHistoricalData = useCallback(async () => {
    if (mode !== "historical") return;
    setLoading(true);
    try {
      const dates = dateRangeInfo.dates;
      const firstDate = dates[0];
      const lastDate = dates[dates.length - 1];

      // Only use timeRange for day mode; week/month always use full day
      const isDayMode = dateMode === "day";
      const startHour = isDayMode ? String(timeRange[0]).padStart(2, "0") : "00";
      const endTs = isDayMode
        ? timeRange[1] === 24
          ? "23:59:59"
          : `${String(timeRange[1]).padStart(2, "0")}:00:00`
        : "23:59:59";

      const startTimestamp = `${firstDate}T${startHour}:00:00`;
      const endTimestamp = `${lastDate}T${endTs}`;

      if (import.meta.env.DEV) console.log("📊 Historical query:", { startTimestamp, endTimestamp, dates });

      const activityCols =
        "id, sdr_name, activity_date, contact_name, company_name, call_outcome, call_duration, activity_type, is_sql, is_decision_maker, meeting_scheduled_date, client_id, recording_url";

      const [activityData, sqlRes, snapshotRes] = await Promise.all([
        fetchAllRows<ActivityRow>(
          "activity_log",
          activityCols,
          (q: any) => {
            let filtered = q;
            if (activeClientFilter) filtered = filtered.eq("client_id", activeClientFilter);
            if (dates.length === 1) {
              return filtered.gte("activity_date", startTimestamp).lte("activity_date", endTimestamp);
            }
            return filtered.or(buildDateOrFilter(dates, "activity_date"));
          },
          "activity_date",
        ),
        (() => {
          let q = supabase
            .from("sql_meetings")
            .select(
              "id, sdr_name, contact_person, company_name, booking_date, meeting_date, meeting_time, meeting_status, client_notes, created_at, client_id",
            )
            .in("meeting_status", [...ACTIVE_SQL_MEETING_STATUSES]);
          if (activeClientFilter) q = q.eq("client_id", activeClientFilter);
          if (dates.length === 1) {
            q = q.eq("booking_date", firstDate);
          } else {
            q = q.in("booking_date", dates);
          }
          return q.order("booking_date", { ascending: false });
        })(),
        (() => {
          let q = supabase
            .from("daily_snapshots")
            .select("sdr_name, client_id, dms_reached")
            .gte("snapshot_date", firstDate)
            .lte("snapshot_date", lastDate);
          if (activeClientFilter) q = q.eq("client_id", activeClientFilter);
          return q;
        })(),
      ]);

      if (import.meta.env.DEV)
        console.log("📊 Historical results:", {
          activities: activityData.length,
          sqlMeetings: sqlRes.data?.length,
          snapshots: snapshotRes.data?.length,
          error: sqlRes.error || snapshotRes.error,
        });

      setActivities(activityData);
      setHistSqlMeetings(
        (sqlRes.data || []).map((r: any) => ({
          ...r,
          meeting_time: r.meeting_time ?? null,
          client_notes: r.client_notes ?? null,
        })) as SqlMeetingRow[],
      );
      setSnapshots(
        snapshotRes.data?.map((s) => ({ ...s, dials: null, answered: null, sqls: null, answer_rate: null })) || [],
      );

      // Latest SQL in period
      const latestSqlInPeriod = sqlRes.data?.[0];
      if (latestSqlInPeriod) {
        setLatestSql({
          sdrName: latestSqlInPeriod.sdr_name || "",
          companyName: latestSqlInPeriod.company_name || "",
          clientId: latestSqlInPeriod.client_id || "",
          createdAt: latestSqlInPeriod.created_at,
        });
      } else {
        setLatestSql(null);
      }
    } catch (err) {
      console.error("Error fetching historical data:", err);
    } finally {
      setLoading(false);
    }
  }, [dateRangeInfo, timeRange, mode, activeClientFilter]);

  useEffect(() => {
    document.title = "J2 Insights Dashboard - Activity Monitor";
  }, []);

  // Fetch data on mode change, live fetch, or auto-refresh
  useEffect(() => {
    if (mode === "live") {
      fetchLiveData();
      fetchLatestSqlLive();
    }
  }, [mode, fetchLiveData, fetchLatestSqlLive, refreshKey]);

  useEffect(() => {
    if (mode === "historical" && histApplied) {
      fetchHistoricalData();
      setHistApplied(false);
    }
  }, [histApplied, fetchHistoricalData, mode]);

  // Auto-apply on mode switch to historical
  useEffect(() => {
    if (mode === "historical") {
      setHistApplied(true);
    }
  }, [mode]);

  // Sync state → URL params
  useEffect(() => {
    const params: Record<string, string> = {};
    params.mode = mode;
    if (mode === "historical") {
      params.dateMode = dateMode;
      params.date = format(histDate, "yyyy-MM-dd");
      params.startHour = String(timeRange[0]);
      params.endHour = String(timeRange[1]);
    }
    setSearchParams(params, { replace: true });
  }, [mode, dateMode, histDate, timeRange, setSearchParams]);

  useRealtimeSubscription({
    table: "activity_log",
    onChange: mode === "live" ? fetchLiveData : undefined,
  });

  // KPI totals
  const totals = useMemo(() => {
    const dials = activities.length;
    const answered = activities.filter((a) => a.call_outcome?.toLowerCase() === "connected").length;
    const conversations = activities.filter(
      (a) => a.call_outcome?.toLowerCase() === "connected" && a.is_decision_maker,
    ).length;
    const sqls = histSqlMeetings.length;
    return { dials, answered, conversations, sqls };
  }, [activities, histSqlMeetings]);

  // SDR rows
  const sdrRows = useMemo(() => {
    const map = new Map<string, SDRRow>();
    const compositeKey = (name: string, clientId: string) => `${name}|||${clientId}`;
    // Build a set of active SDR composite keys for live mode filtering
    const activeSDRKeys = new Set(
      allTeamMembers.filter((m) => m.status === "active").map((m) => compositeKey(m.sdr_name, m.client_id || "")),
    );

    if (mode === "live") {
      // Build SDR rows from activities directly
      for (const a of activities) {
        if (!a.sdr_name) continue;
        const key = compositeKey(a.sdr_name, a.client_id || "");
        if (!activeSDRKeys.has(key)) continue;
        const existing = map.get(key);
        if (existing) {
          existing.dials += 1;
          if (a.call_outcome?.toLowerCase() === "connected") existing.answered += 1;
          if (a.call_outcome?.toLowerCase() === "connected" && a.is_decision_maker) existing.conversations += 1;
        } else {
          const connected = a.call_outcome?.toLowerCase() === "connected";
          map.set(key, {
            sdrName: a.sdr_name,
            clientId: a.client_id || "",
            dials: 1,
            answered: connected ? 1 : 0,
            conversations: connected && a.is_decision_maker ? 1 : 0,
            answerRate: 0,
            sqls: 0,
            conversion: 0,
            lastActivity: null,
          });
        }
      }

      // Set SQLs from sql_meetings for live mode
      const liveSqlCounts = new Map<string, number>();
      for (const m of histSqlMeetings) {
        if (!m.sdr_name) continue;
        const key = compositeKey(m.sdr_name, m.client_id || "");
        liveSqlCounts.set(key, (liveSqlCounts.get(key) || 0) + 1);
      }
      for (const [key, row] of map.entries()) {
        row.sqls = liveSqlCounts.get(key) || 0;
      }
    } else {
      const sqlCountByKey = new Map<string, number>();
      const sqlClientMap = new Map<string, string>();
      for (const m of histSqlMeetings) {
        if (!m.sdr_name) continue;
        const key = compositeKey(m.sdr_name, m.client_id || "");
        sqlCountByKey.set(key, (sqlCountByKey.get(key) || 0) + 1);
        sqlClientMap.set(key, m.client_id || "");
      }

      const allSdrKeys = new Set<string>();
      for (const a of activities) {
        if (a.sdr_name) allSdrKeys.add(compositeKey(a.sdr_name, a.client_id || ""));
      }
      for (const key of sqlCountByKey.keys()) allSdrKeys.add(key);

      for (const key of allSdrKeys) {
        const [sdrName] = key.split("|||");
        const sdrActivities = activities.filter((a) => compositeKey(a.sdr_name || "", a.client_id || "") === key);
        const clientId = sdrActivities[0]?.client_id || sqlClientMap.get(key) || "";
        map.set(key, {
          sdrName,
          clientId: typeof clientId === "string" ? clientId : "",
          dials: sdrActivities.length,
          answered: sdrActivities.filter((a) => a.call_outcome?.toLowerCase() === "connected").length,
          conversations: sdrActivities.filter(
            (a) => a.call_outcome?.toLowerCase() === "connected" && a.is_decision_maker,
          ).length,
          answerRate: 0,
          sqls: sqlCountByKey.get(key) || 0,
          conversion: 0,
          lastActivity: null,
        });
      }
    }

    // Attach last activity timestamp
    for (const a of activities) {
      if (!a.sdr_name) continue;
      const key = compositeKey(a.sdr_name, a.client_id || "");
      const row = map.get(key);
      if (row) {
        const actDate = new Date(a.activity_date);
        if (!row.lastActivity || actDate > row.lastActivity) row.lastActivity = actDate;
      }
    }

    // Recalculate answer rate and conversion
    for (const row of map.values()) {
      row.answerRate = row.dials > 0 ? (row.answered / row.dials) * 100 : 0;
      row.conversion = row.dials > 0 ? (row.sqls / row.dials) * 100 : 0;
    }

    // In live mode (today): show all active team members even if no activity
    if (mode === "live") {
      for (const member of allTeamMembers) {
        if (activeClientFilter && member.client_id !== activeClientFilter) continue;
        const key = compositeKey(member.sdr_name, member.client_id || "");
        if (member.status === "active" && !map.has(key)) {
          map.set(key, {
            sdrName: member.sdr_name,
            clientId: member.client_id || "",
            dials: 0,
            answered: 0,
            conversations: 0,
            answerRate: 0,
            sqls: 0,
            conversion: 0,
            lastActivity: null,
          });
        }
      }
    }

    const rows = Array.from(map.values());
    rows.sort((a, b) => {
      const aActive = a.dials > 0;
      const bActive = b.dials > 0;
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      if (aActive && bActive) {
        let cmp = 0;
        if (sortKey === "sdrName") cmp = a.sdrName.localeCompare(b.sdrName);
        else if (sortKey === "clientId") cmp = a.clientId.localeCompare(b.clientId);
        else cmp = (a[sortKey] as number) - (b[sortKey] as number);
        return sortDir === "desc" ? -cmp : cmp;
      }
      const aClient = clientNameMap[a.clientId] || a.clientId;
      const bClient = clientNameMap[b.clientId] || b.clientId;
      const clientCmp = aClient.localeCompare(bClient);
      if (clientCmp !== 0) return clientCmp;
      return a.sdrName.localeCompare(b.sdrName);
    });

    return rows;
  }, [
    snapshots,
    activities,
    histSqlMeetings,
    mode,
    sortKey,
    sortDir,
    allTeamMembers,
    clientNameMap,
    activeClientFilter,
  ]);

  useEffect(() => {
    setSdrPage(0);
  }, [sdrRows]);

  const pagedSdrRows = sdrRows.slice(sdrPage * SDR_PAGE_SIZE, (sdrPage + 1) * SDR_PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // Drill-down
  const handleDrillDown = async (sdrName: string, metric: DrillMetric) => {
    setDrillDown({ sdrName, metric });
    setDrillPage(0);
    setLoadingDrill(true);
    setDrillDownData([]);
    setDrillDownSqlData([]);
    try {
      if (metric === "answered" || metric === "conversations") {
        let startTimestamp: string;
        let endTimestamp: string;

        if (mode === "live") {
          const startTs = `${todayMelbourne}T00:00:00`;
          const endTs2 = `${todayMelbourne}T23:59:59`;
          let query = supabase
            .from("activity_log")
            .select(
              "id, sdr_name, activity_date, contact_name, company_name, call_outcome, call_duration, activity_type, is_sql, meeting_scheduled_date, client_id, recording_url, is_decision_maker, hubspot_engagement_id",
            )
            .eq("sdr_name", sdrName)
            .ilike("call_outcome", "connected")
            .gte("activity_date", startTs)
            .lte("activity_date", endTs2)
            .order("activity_date", { ascending: false });
          if (activeClientFilter) query = query.eq("client_id", activeClientFilter);
          if (metric === "conversations") query = query.eq("is_decision_maker", true);
          const { data } = await query;
          const sorted = (data || [])
            .map((r) => ({
              ...r,
              recording_url: getRecordingUrlWithFallback({
                recordingUrl: r.recording_url,
                hubspotEngagementId: r.hubspot_engagement_id,
              }),
            }))
            .sort((a, b) => {
              const dateA = new Date(a.activity_date).setHours(0, 0, 0, 0);
              const dateB = new Date(b.activity_date).setHours(0, 0, 0, 0);
              if (dateB !== dateA) return dateB - dateA;
              return (b.call_duration || 0) - (a.call_duration || 0);
            });
          setDrillDownData(sorted);
        } else {
          const dates = dateRangeInfo.dates;
          let query = supabase
            .from("activity_log")
            .select(
              "id, sdr_name, activity_date, contact_name, company_name, call_outcome, call_duration, activity_type, is_sql, meeting_scheduled_date, client_id, recording_url, is_decision_maker, hubspot_engagement_id",
            )
            .eq("sdr_name", sdrName)
            .ilike("call_outcome", "connected");
          if (activeClientFilter) query = query.eq("client_id", activeClientFilter);
          if (dates.length === 1) {
            const startHour = String(timeRange[0]).padStart(2, "0");
            const endTs = timeRange[1] === 24 ? "23:59:59" : `${String(timeRange[1]).padStart(2, "0")}:00:00`;
            query = query
              .gte("activity_date", `${dates[0]}T${startHour}:00:00`)
              .lte("activity_date", `${dates[0]}T${endTs}`);
          } else {
            query = query.or(buildDateOrFilter(dates, "activity_date"));
          }
          query = query.order("activity_date", { ascending: false });
          if (metric === "conversations") query = query.eq("is_decision_maker", true);
          const { data } = await query;
          const sorted = (data || [])
            .map((r) => ({
              ...r,
              recording_url: getRecordingUrlWithFallback({
                recordingUrl: r.recording_url,
                hubspotEngagementId: r.hubspot_engagement_id,
              }),
            }))
            .sort((a, b) => {
              const dateA = new Date(a.activity_date).setHours(0, 0, 0, 0);
              const dateB = new Date(b.activity_date).setHours(0, 0, 0, 0);
              if (dateB !== dateA) return dateB - dateA;
              return (b.call_duration || 0) - (a.call_duration || 0);
            });
          setDrillDownData(sorted);
        }
      } else if (metric === "sqls") {
        let sqlQuery = supabase
          .from("sql_meetings")
          .select(
            "id, sdr_name, contact_person, company_name, booking_date, meeting_date, meeting_time, meeting_status, client_notes, created_at, contact_email, hubspot_engagement_id, client_id",
          )
          .eq("sdr_name", sdrName)
          .in("meeting_status", [...ACTIVE_SQL_MEETING_STATUSES]);
        if (activeClientFilter) sqlQuery = sqlQuery.eq("client_id", activeClientFilter);

        if (mode === "live") {
          sqlQuery = sqlQuery.eq("booking_date", todayMelbourne);
        } else {
          const dates = dateRangeInfo.dates;
          if (dates.length === 1) {
            sqlQuery = sqlQuery.eq("booking_date", dates[0]);
          } else {
            sqlQuery = sqlQuery.in("booking_date", dates);
          }
        }

        const { data: sqlData } = await sqlQuery.order("booking_date", { ascending: false });

        // Batch-fetch recordings: 2 queries instead of N+1
        const enrichedSqlData: SqlMeetingRow[] = [];
        if (sqlData && sqlData.length > 0) {
          // Batch 1: fetch by hubspot_engagement_id
          const engagementIds = sqlData.map((s) => s.hubspot_engagement_id).filter((id): id is string => !!id);
          const engagementMap = new Map<
            string,
            { recording_url: string | null; call_duration: number | null; activity_date: string | null }
          >();
          if (engagementIds.length > 0) {
            const { data: engData } = await supabase
              .from("activity_log")
              .select("hubspot_engagement_id, recording_url, call_duration, activity_date")
              .in("hubspot_engagement_id", engagementIds);
            if (engData) {
              for (const row of engData) {
                if (row.hubspot_engagement_id && !engagementMap.has(row.hubspot_engagement_id)) {
                  engagementMap.set(row.hubspot_engagement_id, {
                    recording_url: getRecordingUrlWithFallback({
                      recordingUrl: row.recording_url,
                      hubspotEngagementId: row.hubspot_engagement_id,
                    }),
                    call_duration: row.call_duration,
                    activity_date: row.activity_date,
                  });
                }
              }
            }
          }

          // Batch 2: fallback by contact_name for SQLs without engagement match
          const fallbackNames = sqlData
            .filter((s) => !s.hubspot_engagement_id || !engagementMap.has(s.hubspot_engagement_id))
            .map((s) => s.contact_person?.trim())
            .filter((n): n is string => !!n);
          const nameMap = new Map<
            string,
            { recording_url: string | null; call_duration: number | null; activity_date: string | null }
          >();
          if (fallbackNames.length > 0) {
            const { data: nameData } = await supabase
              .from("activity_log")
              .select("contact_name, recording_url, call_duration, activity_date")
              .eq("sdr_name", sdrName)
              .ilike("call_outcome", "connected")
              .in("contact_name", fallbackNames)
              .order("call_duration", { ascending: false });
            if (nameData) {
              for (const row of nameData) {
                const key = row.contact_name?.toLowerCase();
                if (key && !nameMap.has(key)) {
                  nameMap.set(key, {
                    recording_url: row.recording_url,
                    call_duration: row.call_duration,
                    activity_date: row.activity_date,
                  });
                }
              }
            }
          }

          // Match results in memory
          for (const sql of sqlData) {
            let recording_url: string | null = null;
            let call_duration: number | null = null;
            let activity_date: string | null = null;

            if (sql.hubspot_engagement_id && engagementMap.has(sql.hubspot_engagement_id)) {
              const match = engagementMap.get(sql.hubspot_engagement_id)!;
              recording_url = match.recording_url;
              call_duration = match.call_duration;
              activity_date = match.activity_date;
            } else if (sql.contact_person) {
              const match = nameMap.get(sql.contact_person.trim().toLowerCase());
              if (match) {
                recording_url = match.recording_url;
                call_duration = match.call_duration;
                activity_date = match.activity_date;
              }
            }

            // Fallback: construct recording URL from engagement ID if still null
            recording_url = getRecordingUrlWithFallback({
              recordingUrl: recording_url,
              hubspotEngagementId: sql.hubspot_engagement_id,
            });

            enrichedSqlData.push({
              ...sql,
              recording_url,
              call_duration,
              activity_date,
              created_at: sql.created_at ?? null,
              meeting_time: sql.meeting_time ?? null,
              meeting_status: sql.meeting_status ?? null,
              client_notes: sql.client_notes ?? null,
            });
          }
        }
        enrichedSqlData.sort(
          (a, b) =>
            new Date(b.created_at || b.activity_date || `${b.booking_date}T00:00:00`).getTime() -
            new Date(a.created_at || a.activity_date || `${a.booking_date}T00:00:00`).getTime(),
        );
        setDrillDownSqlData(enrichedSqlData);
      }
    } catch (err) {
      console.error("Drill-down error:", err);
    } finally {
      setLoadingDrill(false);
    }
  };

  // Auto-refresh relative timestamps every 60s
  const [, setTick] = useState(0);
  useEffect(() => {
    if (mode !== "live") return;
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, [mode]);

  const getStatusColor = (lastActivity: Date | null): "green" | "yellow" | "red" => {
    if (!lastActivity) return "red";
    const diffMs = Date.now() - lastActivity.getTime();
    if (diffMs < 30 * 60 * 1000) return "green";
    if (diffMs < 60 * 60 * 1000) return "yellow";
    return "red";
  };

  const formatRelativeTime = (d: Date | null): string => {
    if (!d) return "-";
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${Math.floor(mins)} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ${hrs === 1 ? "hr" : "hrs"} ago`;
    return format(d, "MMM d");
  };

  const isRecentActivity = (lastActivity: Date | null) => {
    if (!lastActivity) return false;
    return Date.now() - lastActivity.getTime() < 5 * 60 * 1000;
  };

  const toggleWeekday = (day: AllDay) => {
    setSelectedWeekdays((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== day);
      }
      return [...prev, day];
    });
  };

  // Measure pills width for slider sizing
  useEffect(() => {
    const measure = () => {
      if (pillsRef.current) {
        setPillsWidth(pillsRef.current.offsetWidth);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [dateMode, selectedWeekdays]);

  const daysSummary = useMemo(() => {
    const days = selectedWeekdays;
    if (days.length === 0) return "";
    if (days.length === 7) return "Monday – Sunday";
    const isMonFri = days.length === 5 && ALL_WEEKDAYS.every((d) => days.includes(d));
    if (isMonFri) return "Monday – Friday";
    const isSatSun = days.length === 2 && days.includes("Saturday") && days.includes("Sunday");
    if (isSatSun) return "Saturday – Sunday";
    const sorted = [...days].sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b));
    if (days.length === 1) return sorted[0];
    const indices = sorted.map((d) => ALL_DAYS.indexOf(d));
    const isConsecutive = indices.every((v, i) => i === 0 || v === indices[i - 1] + 1);
    if (isConsecutive) return `${sorted[0]} – ${sorted[sorted.length - 1]}`;
    if (sorted.length > 4) return `${sorted.length} of 7 days`;
    return sorted.map((d) => d.substring(0, 3)).join(", ");
  }, [selectedWeekdays]);

  const navigateDate = (direction: "prev" | "next") => {
    if (dateMode === "day") {
      setHistDate((d) => (direction === "next" ? new Date(d.getTime() + 86400000) : new Date(d.getTime() - 86400000)));
    } else if (dateMode === "week") {
      setHistDate((d) => (direction === "next" ? addWeeks(d, 1) : subWeeks(d, 1)));
    } else {
      setHistDate((d) => (direction === "next" ? addMonths(d, 1) : subMonths(d, 1)));
    }
  };

  const answerRateDisplay = totals.dials > 0 ? ((totals.answered / totals.dials) * 100).toFixed(1) + "%" : "0.0%";

  const kpiCards = [
    {
      label: "Total Dials",
      value: totals.dials.toLocaleString(),
      icon: Phone,
      iconColor: "#f59e0b",
      iconBg: "rgba(245,158,11,0.1)",
    },
    {
      label: "Total Answered",
      value: totals.answered.toLocaleString(),
      icon: PhoneIncoming,
      iconColor: "#10b981",
      iconBg: "rgba(16,185,129,0.1)",
    },
    {
      label: "Answer Rate",
      value: answerRateDisplay,
      icon: Percent,
      iconColor: "#6366f1",
      iconBg: "rgba(99,102,241,0.1)",
    },
    {
      label: "DM Conversations",
      value: totals.conversations.toLocaleString(),
      icon: Handshake,
      iconColor: "#0d9488",
      iconBg: "rgba(13,148,136,0.1)",
      clickable: true,
    },
    {
      label: "Total SQLs",
      value: totals.sqls.toLocaleString(),
      icon: Target,
      iconColor: "#f43f5e",
      iconBg: "rgba(244,63,94,0.1)",
    },
  ];

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-bold text-[#0f172a] dark:text-[#f1f5f9] hover:text-[#0f172a] dark:hover:text-[#f1f5f9]"
      onClick={() => toggleSort(sortKeyName)}
    >
      {label}
      {sortKey === sortKeyName ? (
        sortDir === "asc" ? (
          <ArrowUp className="ml-1 h-3 w-3 text-[#0f172a] dark:text-white" />
        ) : (
          <ArrowDown className="ml-1 h-3 w-3 text-[#0f172a] dark:text-white" />
        )
      ) : (
        <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />
      )}
    </Button>
  );

  return (
    <div id="activity-monitor-content" className="space-y-6 animate-fade-in">
      {/* Header + Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {mode === "live" ? "Today's Activity" : "Performance Analysis"}
          </h1>
          <p className="text-muted-foreground">{mode === "live" ? todayFormatted : dateRangeInfo.label}</p>
        </div>
        <div className="flex items-center gap-2">
          {mode === "live" && (
            <Badge variant="outline" className="gap-2 border-green-500/50 text-green-500 px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Live
            </Badge>
          )}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setMode("live")}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                mode === "live"
                  ? "bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a] border-r border-border"
                  : "bg-card text-muted-foreground hover:text-foreground border-r border-border",
              )}
            >
              Live Today
            </button>
            <button
              onClick={() => setMode("historical")}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                mode === "historical"
                  ? "bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a]"
                  : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              Historical View
            </button>
          </div>
        </div>
      </div>

      {/* Historical Filters */}
      {mode === "historical" && !isMobile && (
        <Card className="bg-muted/30 backdrop-blur-sm border-border/80">
          <div style={{ padding: "4px 0 8px 0" }}>
            {/* Date Mode Tabs */}
            <Tabs
              value={dateMode}
              onValueChange={(v) => {
                const dm = v as DateMode;
                setDateMode(dm);
                if (dm === "week" || dm === "month") setTimeRange([0, 24]);
                else setTimeRange([0, 24]);
              }}
            >
              <TabsList className="bg-muted/50" style={{ marginTop: 0, marginBottom: 4 }}>
                <TabsTrigger
                  value="day"
                  className="data-[state=active]:bg-[#0f172a] data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-[#0f172a] data-[state=inactive]:text-muted-foreground"
                >
                  Day
                </TabsTrigger>
                <TabsTrigger
                  value="week"
                  className="data-[state=active]:bg-[#0f172a] data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-[#0f172a] data-[state=inactive]:text-muted-foreground"
                >
                  Week
                </TabsTrigger>
                <TabsTrigger
                  value="month"
                  className="data-[state=active]:bg-[#0f172a] data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-[#0f172a] data-[state=inactive]:text-muted-foreground"
                >
                  Month
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filter row — CSS Grid layout */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1px 2fr 1px auto",
                alignItems: "center",
                gap: "0 24px",
                padding: "0px 16px 2px 16px",
              }}
            >
              {/* ZONE 1 — Date navigator */}
              <div className="flex flex-col" style={{ gap: 6, padding: "2px 0" }}>
                <span className="font-medium text-slate-500 dark:text-slate-400" style={{ fontSize: 11 }}>
                  {dateMode === "day" ? "DATE" : dateMode === "week" ? "WEEK" : "MONTH"}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigateDate("prev")}
                    className="flex items-center justify-center shrink-0 bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a] hover:opacity-80 transition-opacity rounded-md border border-white/20 dark:border-gray-300"
                    style={{ width: 30, height: 34 }}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  {dateMode === "day" ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="flex items-center text-xs font-medium text-white whitespace-nowrap hover:opacity-80 transition-opacity bg-[#0f172a] dark:bg-white dark:text-[#0f172a] border border-white/20 dark:border-gray-300 rounded-md"
                          style={{ padding: "0 12px", height: 34, minWidth: 140 }}
                        >
                          <CalendarIcon className="mr-1.5 h-3 w-3 shrink-0" />
                          {format(histDate, "EEEE, MMM d, yyyy")}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={histDate}
                          onSelect={(d) => d && setHistDate(d)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div
                      className="flex items-center justify-center text-xs font-medium text-white whitespace-nowrap bg-[#0f172a] dark:bg-white dark:text-[#0f172a] border border-white/20 dark:border-gray-300 rounded-md"
                      style={{ padding: "0 12px", height: 34 }}
                    >
                      {dateRangeInfo.label}
                    </div>
                  )}
                  <button
                    onClick={() => navigateDate("next")}
                    className="flex items-center justify-center shrink-0 bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a] hover:opacity-80 transition-opacity rounded-md border border-white/20 dark:border-gray-300"
                    style={{ width: 30, height: 34 }}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* DIVIDER */}
              <div className="self-stretch bg-slate-300 dark:bg-white/[0.08]" />

              <div className="flex flex-col items-start" style={{ gap: 6, padding: "2px 0" }}>
                {dateMode === "day" ? (
                  <>
                    <span className="font-medium text-slate-500 dark:text-slate-400" style={{ fontSize: 11 }}>
                      TIME RANGE
                    </span>
                    <div className="flex items-center gap-2">
                      <Select
                        value={String(timeRange[0])}
                        onValueChange={(v) => setTimeRange([parseInt(v), timeRange[1]])}
                      >
                        <SelectTrigger className="h-[34px] w-[130px] bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a] border-white/20 dark:border-gray-300 text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={String(i)}>
                              {formatHour(i)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">→</span>
                      <Select
                        value={String(timeRange[1])}
                        onValueChange={(v) => setTimeRange([timeRange[0], parseInt(v)])}
                      >
                        <SelectTrigger className="h-[34px] w-[130px] bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a] border-white/20 dark:border-gray-300 text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                            <SelectItem key={h} value={String(h)}>
                              {h === 24 ? "11:59 PM" : formatHour(h)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap ml-3">
                        · {timeRange[1] - timeRange[0]} hrs selected
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-slate-500 dark:text-slate-400" style={{ fontSize: 11 }}>
                      DAYS
                    </span>
                    <div className="flex items-center gap-3 w-full">
                      <div ref={pillsRef} className="flex gap-1.5 shrink-0">
                        {ALL_DAYS.map((day) => {
                          const isActive = selectedWeekdays.includes(day);
                          return (
                            <button
                              key={day}
                              onClick={() => toggleWeekday(day)}
                              className={cn(
                                "font-semibold transition-colors rounded-lg text-xs h-[34px] px-2.5",
                                isActive &&
                                  "bg-[#0f172a] text-white hover:opacity-90 border-transparent dark:bg-white dark:text-[#0f172a]",
                                !isActive &&
                                  "bg-transparent text-[#94a3b8] hover:text-foreground border border-[#e2e8f0] dark:border-white/10",
                              )}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1 }}>
                        <span className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8]">
                          <span className="text-[#cbd5e1]">· </span>
                          {daysSummary}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* DIVIDER */}
              <div className="self-stretch bg-slate-300 dark:bg-white/[0.08]" />

              {/* ZONE 3 — Apply Filters */}
              <div style={{ padding: "14px 0" }}>
                <Button
                  onClick={() => setHistApplied(true)}
                  className="bg-[#0f172a] hover:bg-[#1e293b] text-white dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100 px-5 text-sm shrink-0"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-[#0f172a] dark:text-[#f1f5f9]">{kpi.label}</CardTitle>
              <div className="p-2 rounded-lg" style={{ backgroundColor: kpi.iconBg }}>
                <kpi.icon className="h-4 w-4" style={{ color: kpi.iconColor }} />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-9 w-16 bg-muted/40 rounded animate-pulse" />
              ) : (
                <p className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] dark:text-[#f1f5f9]">{kpi.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 border border-border/60 rounded-lg px-4 py-2.5">
          <span>🎯</span>
          {mode === "live" ? (
            latestSql ? (
              <span>
                <span className="font-semibold text-foreground">Latest SQL</span>
                {" · "}
                <span>{latestSql.sdrName}</span>
                {" booked "}
                <span className="font-semibold text-foreground">{latestSql.companyName}</span>
                {" · "}
                <span>
                  {new Date(latestSql.createdAt).toLocaleTimeString("en-AU", {
                    timeZone: "Australia/Melbourne",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
                {" · "}
                <span>{clientNameMap[latestSql.clientId] || latestSql.clientId}</span>
              </span>
            ) : (
              <span className="italic">Waiting for today's first SQL to be booked...</span>
            )
          ) : (
            latestSql && (
              <span>
                <span className="font-semibold text-foreground">Latest SQL</span>
                {" · "}
                <span>{latestSql.sdrName}</span>
                {" booked "}
                <span className="font-semibold text-foreground">{latestSql.companyName}</span>
                {" · "}
                <span>
                  {new Date(latestSql.createdAt).toLocaleDateString("en-AU", {
                    timeZone: "Australia/Melbourne",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                {" · "}
                <span>{clientNameMap[latestSql.clientId] || latestSql.clientId}</span>
              </span>
            )
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100 gap-2">
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer">
              <FileText className="h-4 w-4" /> Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
              <Table2 className="h-4 w-4" /> Export as Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* SDR Table */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>SDR Performance</CardTitle>
          <div className="flex items-center gap-3">
            {(() => {
              const activeMembers = allTeamMembers.filter(
                (m) => m.status === "active" && (!activeClientFilter || m.client_id === activeClientFilter),
              );
              const totalCount = activeMembers.length;
              const activeTodaySet = new Set(
                sdrRows.filter((r) => r.dials > 0).map((r) => `${r.sdrName}|||${r.clientId}`),
              );
              const activeToday = activeMembers.filter((m) =>
                activeTodaySet.has(`${m.sdr_name}|||${m.client_id || ""}`),
              ).length;
              const notStarted = totalCount - activeToday;
              return (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {activeToday} Active
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    {notStarted} Not Started
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <span className="w-2 h-2 rounded-full bg-[#475569]" />
                    {totalCount} Total
                  </span>
                </div>
              );
            })()}
            <Separator orientation="vertical" className="h-6" />
            {isMobile ? (
              <Button
                className="bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100 gap-2"
                size="sm"
                onClick={() => setFilterDrawerOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </Button>
            ) : (
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger
                  className={cn(
                    "w-[180px] min-h-[40px] text-xs sm:text-sm rounded-md transition-all duration-200",
                    "bg-[#0f172a] text-white border-[#0f172a] hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:border-white dark:hover:bg-gray-100 font-semibold",
                  )}
                >
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-card">
                  <SelectItem value="all">All Clients</SelectItem>
                  {clientOptions.map((c) => (
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
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3 py-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />
              ))}
            </div>
          ) : sdrRows.length === 0 ? (
            <EmptyState
              icon={mode === "live" ? Phone : CalendarIcon}
              title={mode === "live" ? "No activity recorded yet" : "No activity found"}
              description={
                mode === "live"
                  ? "Calls will appear here once SDRs start dialing. Check back later!"
                  : "Try adjusting the date or time range to find activity data."
              }
            />
          ) : isMobile && mode === "live" ? (
            /* Mobile stacked card layout for Live Today */
            <div className="space-y-2">
              {pagedSdrRows.map((row) => {
                const recent = isRecentActivity(row.lastActivity);
                return (
                  <div
                    key={`${row.sdrName}-${row.clientId}`}
                    className={cn("rounded-lg border border-border/50 p-3", recent && "bg-green-500/5")}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="relative shrink-0">
                        <SDRAvatar name={row.sdrName} photoUrl={sdrPhotoMap[row.sdrName]} size="sm" />
                        <span
                          className={cn(
                            "absolute bottom-0 left-0 rounded-full border-2 border-white dark:border-white",
                            getStatusColor(row.lastActivity) === "green" && "bg-green-500",
                            getStatusColor(row.lastActivity) === "yellow" && "bg-yellow-500",
                            getStatusColor(row.lastActivity) === "red" && "bg-red-500",
                          )}
                          style={{ width: 10, height: 10 }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{row.sdrName}</p>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          {clientLogoMap[row.clientId] && (
                            <img
                              src={clientLogoMap[row.clientId]!}
                              alt=""
                              className="w-3.5 h-3.5 rounded-full object-contain"
                            />
                          )}
                          <span className="truncate">{clientNameMap[row.clientId] || row.clientId}</span>
                        </span>
                      </div>
                      {row.lastActivity && (
                        <span
                          className={cn(
                            "text-xs shrink-0",
                            (Date.now() - row.lastActivity.getTime()) / 60000 <= 5
                              ? "text-[#10b981] font-medium"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatRelativeTime(row.lastActivity)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span>
                        <span className="font-medium text-foreground">{row.dials}</span> Dials
                      </span>
                      <span>
                        <span className="font-medium text-foreground">{row.answered}</span> Ans
                      </span>
                      <span>{row.answerRate.toFixed(1)}%</span>
                      <span>
                        <span className="font-medium text-foreground">{row.sqls}</span> SQLs
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={cn("w-full", isMobile ? "overflow-x-auto" : "overflow-x-hidden")}>
              <Table>
                <TableHeader className="table-header-navy">
                  <TableRow>
                    <TableHead className="px-4 py-3 text-left" style={{ minWidth: 180 }}>
                      <SortHeader label="SDR Name" sortKeyName="sdrName" />
                    </TableHead>
                    <TableHead className="px-4 py-3 text-left">
                      <SortHeader label="Client" sortKeyName="clientId" />
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center">
                      <SortHeader label="Dials" sortKeyName="dials" />
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center">
                      <SortHeader label="Answered" sortKeyName="answered" />
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center">
                      <SortHeader label="Answer Rate" sortKeyName="answerRate" />
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center">
                      <SortHeader label="DM Conversations" sortKeyName="conversations" />
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center">
                      <SortHeader label="SQLs" sortKeyName="sqls" />
                    </TableHead>
                    {isPexa && <TableHead className="px-4 py-3 text-center">Demo Booked</TableHead>}
                    {isPexa && <TableHead className="px-4 py-3 text-center">Demo Attended</TableHead>}
                    <TableHead className="px-4 py-3 text-center">
                      <SortHeader label="Conversion Rate" sortKeyName="conversion" />
                    </TableHead>
                    {mode === "live" && <TableHead className="px-4 py-3 text-center">Last Activity</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody className="table-striped">
                  {(() => {
                    let dividerShown = false;
                    return pagedSdrRows.map((row) => {
                      const recent = mode === "live" && isRecentActivity(row.lastActivity);
                      const showDivider = !dividerShown && row.dials === 0;
                      if (showDivider) dividerShown = true;
                      return (
                        <>
                          {showDivider && (
                            <TableRow key="inactive-divider" className="border-0 pointer-events-none">
                              <TableCell colSpan={mode === "live" ? 9 : 8} className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-px bg-border/50" />
                                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                                    No Activity Today
                                  </span>
                                  <div className="flex-1 h-px bg-border/50" />
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                          <TableRow
                            key={row.sdrName}
                            className={cn(
                              "border-border/50 transition-all",
                              recent && "bg-green-500/5 shadow-[inset_0_0_20px_rgba(34,197,94,0.05)]",
                            )}
                          >
                            <TableCell className="font-medium text-foreground px-4 py-2" style={{ minWidth: 180 }}>
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                <div className="relative shrink-0">
                                  <SDRAvatar name={row.sdrName} photoUrl={sdrPhotoMap[row.sdrName]} size="sm" />
                                  {mode === "live" && (
                                    <span
                                      className={cn(
                                        "absolute bottom-0 left-0 rounded-full border-2 border-white dark:border-white",
                                        getStatusColor(row.lastActivity) === "green" && "bg-green-500",
                                        getStatusColor(row.lastActivity) === "yellow" && "bg-yellow-500",
                                        getStatusColor(row.lastActivity) === "red" && "bg-red-500",
                                      )}
                                      style={{ width: 10, height: 10 }}
                                    />
                                  )}
                                </div>
                                {row.sdrName}
                              </div>
                            </TableCell>
                            <TableCell
                              className="text-muted-foreground px-4 py-2 whitespace-nowrap overflow-hidden text-ellipsis"
                              style={{ maxWidth: 180 }}
                            >
                              <span className="flex items-center gap-1.5">
                                {clientLogoMap[row.clientId] ? (
                                  <img
                                    src={clientLogoMap[row.clientId]!}
                                    alt=""
                                    className="w-5 h-5 rounded-full object-contain flex-shrink-0"
                                  />
                                ) : null}
                                <span className="truncate">{clientNameMap[row.clientId] || row.clientId}</span>
                              </span>
                            </TableCell>
                            <TableCell className="text-sm font-medium text-foreground text-center px-4 py-2">
                              {row.dials}
                            </TableCell>
                            <TableCell className="text-center px-4 py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="font-semibold text-foreground hover:text-foreground/80"
                                onClick={() => handleDrillDown(row.sdrName, "answered")}
                              >
                                {row.answered}
                              </Button>
                            </TableCell>
                            <TableCell className="text-sm font-medium text-foreground text-center px-4 py-2">
                              {row.answerRate.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-center px-4 py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="font-semibold text-foreground hover:text-foreground/80"
                                onClick={() => handleDrillDown(row.sdrName, "conversations")}
                              >
                                {row.conversations}
                              </Button>
                            </TableCell>
                            <TableCell className="text-center px-4 py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="font-bold text-foreground hover:text-foreground/80"
                                onClick={() => handleDrillDown(row.sdrName, "sqls")}
                              >
                                {row.sqls}
                              </Button>
                            </TableCell>
                            {isPexa &&
                              (() => {
                                const counts = demoCounts.get(row.sdrName);
                                const booked = counts?.demo_booked || 0;
                                const attended = counts?.demo_attended || 0;
                                return (
                                  <>
                                    <TableCell className="text-center px-4 py-2">
                                      <button
                                        className={
                                          booked > 0
                                            ? "text-[#3b82f6] font-medium hover:underline cursor-pointer tabular-nums"
                                            : "text-muted-foreground tabular-nums"
                                        }
                                        onClick={() =>
                                          booked > 0 &&
                                          setDemoModalSdr({
                                            sdrName: row.sdrName,
                                            dateRange:
                                              mode === "live"
                                                ? {
                                                    from: new Date(todayMelbourne + "T00:00:00"),
                                                    to: new Date(todayMelbourne + "T23:59:59"),
                                                  }
                                                : {
                                                    from: new Date(
                                                      (dateRangeInfo.dates[0] || todayMelbourne) + "T00:00:00",
                                                    ),
                                                    to: new Date(
                                                      (dateRangeInfo.dates[dateRangeInfo.dates.length - 1] ||
                                                        todayMelbourne) + "T23:59:59",
                                                    ),
                                                  },
                                          })
                                        }
                                      >
                                        {booked}
                                      </button>
                                    </TableCell>
                                    <TableCell className="text-center px-4 py-2">
                                      <button
                                        className={
                                          attended > 0
                                            ? "text-[#10b981] font-medium hover:underline cursor-pointer tabular-nums"
                                            : "text-muted-foreground tabular-nums"
                                        }
                                        onClick={() =>
                                          attended > 0 &&
                                          setDemoModalSdr({
                                            sdrName: row.sdrName,
                                            dateRange:
                                              mode === "live"
                                                ? {
                                                    from: new Date(todayMelbourne + "T00:00:00"),
                                                    to: new Date(todayMelbourne + "T23:59:59"),
                                                  }
                                                : {
                                                    from: new Date(
                                                      (dateRangeInfo.dates[0] || todayMelbourne) + "T00:00:00",
                                                    ),
                                                    to: new Date(
                                                      (dateRangeInfo.dates[dateRangeInfo.dates.length - 1] ||
                                                        todayMelbourne) + "T23:59:59",
                                                    ),
                                                  },
                                          })
                                        }
                                      >
                                        {attended}
                                      </button>
                                    </TableCell>
                                  </>
                                );
                              })()}
                            <TableCell className="text-sm font-medium text-foreground text-center px-4 py-2">
                              {row.conversion.toFixed(1)}%
                            </TableCell>
                            {mode === "live" && (
                              <TableCell className="text-center px-4 py-2">
                                {row.lastActivity ? (
                                  (() => {
                                    const minutesAgo = (Date.now() - new Date(row.lastActivity).getTime()) / 60000;
                                    return (
                                      <span
                                        className={
                                          minutesAgo <= 5
                                            ? "text-sm text-[#10b981] font-medium"
                                            : "text-sm text-muted-foreground"
                                        }
                                      >
                                        {formatRelativeTime(row.lastActivity)}
                                      </span>
                                    );
                                  })()
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        </>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </div>
          )}
          {sdrRows.length > SDR_PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 pt-4 border-t border-border/50">
              <span className="text-sm text-muted-foreground">
                Showing {sdrPage * SDR_PAGE_SIZE + 1}–{Math.min((sdrPage + 1) * SDR_PAGE_SIZE, sdrRows.length)} of{" "}
                {sdrRows.length} SDRs
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSdrPage((p) => p - 1)}
                  disabled={sdrPage === 0}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSdrPage((p) => p + 1)}
                  disabled={(sdrPage + 1) * SDR_PAGE_SIZE >= sdrRows.length}
                  className="gap-1"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drill-down Modal */}
      <Dialog
        open={!!drillDown}
        onOpenChange={(open) => {
          if (!open) {
            setDrillDown(null);
            setPlayingRecordingId(null);
          }
        }}
      >
        <DialogContent
          className={cn(
            "bg-card border-border overflow-hidden flex flex-col",
            isMobile ? "w-full h-full max-w-full max-h-full rounded-none" : "sm:max-w-[900px] max-h-[80vh]",
          )}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {drillDown?.sdrName} –{" "}
              {drillDown?.metric === "answered"
                ? "Answered Calls"
                : drillDown?.metric === "conversations"
                  ? "DM Conversations"
                  : "SQL Meetings"}
            </DialogTitle>
            {drillDown?.metric === "sqls" ? (
              <p className="text-sm text-muted-foreground mt-1">
                {drillDownSqlData.length} record{drillDownSqlData.length !== 1 ? "s" : ""}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                {drillDownData.length} record{drillDownData.length !== 1 ? "s" : ""}
              </p>
            )}
          </DialogHeader>
          {loadingDrill ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-[#0f172a] border-t-transparent animate-spin dark:border-white dark:border-t-transparent" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : drillDown?.metric === "answered" || drillDown?.metric === "conversations" ? (
            drillDownData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {drillDown?.metric === "conversations"
                  ? "No decision maker conversations found in this time range."
                  : "No connected calls found for this SDR in the selected time range."}
              </p>
            ) : (
              <div className="overflow-y-auto overflow-x-hidden flex-1 max-w-full">
                <Table>
                  <TableHeader className="table-header-navy sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="py-3 text-left">{mode === "live" ? "Time" : "Date"}</TableHead>
                      <TableHead className="py-3 text-left">Contact Person</TableHead>
                      <TableHead className="py-3 text-left">Company</TableHead>
                      <TableHead className="py-3 text-right">Duration</TableHead>
                      <TableHead className="py-3 text-center">Recording</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="table-striped">
                    {drillDownData
                      .slice(drillPage * DRILL_PAGE_SIZE, (drillPage + 1) * DRILL_PAGE_SIZE)
                      .map((a, index) => (
                        <>
                          <TableRow key={a.id} className="border-border/50">
                            <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                              {mode === "live"
                                ? new Date(a.activity_date)
                                    .toLocaleTimeString("en-AU", {
                                      timeZone: "Australia/Melbourne",
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    })
                                    .replace(" am", " AM")
                                    .replace(" pm", " PM")
                                : new Date(a.activity_date).toLocaleDateString("en-AU", {
                                    timeZone: "Australia/Melbourne",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                            </TableCell>
                            <TableCell className="font-medium text-foreground">{a.contact_name || "-"}</TableCell>
                            <TableCell className="text-muted-foreground">{a.company_name || "-"}</TableCell>
                            <TableCell className="text-right">
                              {a.call_duration ? (
                                <span
                                  className={`font-medium ${
                                    a.call_duration < 30
                                      ? "text-muted-foreground"
                                      : a.call_duration < 120
                                        ? "text-orange-500"
                                        : "text-green-500"
                                  }`}
                                  title={`${a.call_duration} seconds`}
                                >
                                  {Math.floor(a.call_duration / 60)}m {a.call_duration % 60}s
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {a.recording_url ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
                                  onClick={() => setPlayingRecordingId(playingRecordingId === a.id ? null : a.id)}
                                >
                                  {playingRecordingId === a.id ? (
                                    <>
                                      <Square className="h-3 w-3 mr-1" /> Stop
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-3 w-3 mr-1" /> Play
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">No recording</span>
                              )}
                            </TableCell>
                          </TableRow>
                          {playingRecordingId === a.id && a.recording_url && (
                            <TableRow key={`${a.id}-audio`} className="border-border/50 bg-muted/30">
                              <TableCell colSpan={5} className="py-3">
                                <div className="flex items-center gap-3">
                                  <Volume2 className="h-4 w-4 text-blue-500 shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-xs text-muted-foreground mb-1.5">
                                      Call Recording - {a.contact_name || "Unknown"}
                                    </p>
                                    <audio
                                      controls
                                      src={a.recording_url}
                                      className="w-full h-8"
                                      autoPlay
                                      onError={() => {
                                        setPlayingRecordingId(null);
                                      }}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : drillDownSqlData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No SQLs booked for this SDR in the selected time range.
            </p>
          ) : (
            <div className="overflow-y-auto overflow-x-hidden flex-1 max-w-full">
              <Table className="table-fixed w-full">
                <TableHeader className="table-header-navy sticky top-0 z-10">
                  <TableRow>
                    <TableHead className={cn("text-left", mode === "live" ? "w-[14%]" : "w-[20%]")}>
                      Booked At
                    </TableHead>
                    <TableHead className={cn("text-left", mode === "live" ? "w-[20%]" : "w-[18%]")}>
                      Contact Person
                    </TableHead>
                    <TableHead className={cn("text-left", mode === "live" ? "w-[18%]" : "w-[16%]")}>Company</TableHead>
                    <TableHead className={cn("text-center", mode === "live" ? "w-[24%]" : "w-[22%]")}>
                      Meeting Date
                    </TableHead>
                    <TableHead className={cn("text-center", mode === "live" ? "w-[24%]" : "w-[24%]")}>
                      Recording
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="table-striped">
                  {drillDownSqlData
                    .slice(drillPage * DRILL_PAGE_SIZE, (drillPage + 1) * DRILL_PAGE_SIZE)
                    .map((m, index) => {
                      const meetingDateStr = formatScheduledMeetingDateTime(m.meeting_date, m.meeting_time ?? null);
                      return (
                        <>
                          <TableRow key={m.id} className={cn("border-border/50")}>
                            <TableCell className="text-left text-sm text-muted-foreground whitespace-nowrap tabular-nums">
                              {(() => {
                                const ts = m.created_at || m.activity_date || null;
                                if (!ts) return "-";
                                const d = new Date(ts);
                                const timeStr = d
                                  .toLocaleTimeString("en-AU", {
                                    timeZone: "Australia/Melbourne",
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  })
                                  .replace(" am", " AM")
                                  .replace(" pm", " PM");
                                if (mode === "live") return timeStr;
                                const dateStr = d.toLocaleDateString("en-AU", {
                                  timeZone: "Australia/Melbourne",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                });
                                return `${dateStr} · ${timeStr}`;
                              })()}
                            </TableCell>
                            <TableCell className="text-left font-medium">{m.contact_person || "-"}</TableCell>
                            <TableCell className="text-left">{m.company_name || "-"}</TableCell>
                            <TableCell className="text-center whitespace-nowrap tabular-nums">
                              {meetingDateStr}
                            </TableCell>
                            <TableCell className="text-center">
                              {m.recording_url ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
                                  onClick={() => setPlayingRecordingId(playingRecordingId === m.id ? null : m.id)}
                                >
                                  {playingRecordingId === m.id ? (
                                    <>
                                      <Square className="h-3 w-3 mr-1" /> Stop
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-3 w-3 mr-1" /> Play
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">No recording</span>
                              )}
                            </TableCell>
                          </TableRow>
                          {playingRecordingId === m.id && m.recording_url && (
                            <TableRow key={`${m.id}-audio`} className="border-border/50 bg-muted/30">
                              <TableCell colSpan={5} className="py-3">
                                <div className="flex items-center gap-3">
                                  <Volume2 className="h-4 w-4 text-blue-500 shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-xs text-muted-foreground mb-1.5">
                                      SQL Call Recording - {m.contact_person || "Unknown"}
                                    </p>
                                    <audio
                                      controls
                                      src={m.recording_url}
                                      className="w-full h-8"
                                      autoPlay
                                      onError={() => setPlayingRecordingId(null)}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
          {(() => {
            const totalRecords = drillDown?.metric === "sqls" ? drillDownSqlData.length : drillDownData.length;
            if (totalRecords === 0) return null;
            return (
              <div className="flex items-center justify-between px-2 pt-3 border-t border-border/50 shrink-0">
                <span className="text-sm text-muted-foreground">
                  Showing {drillPage * DRILL_PAGE_SIZE + 1}–{Math.min((drillPage + 1) * DRILL_PAGE_SIZE, totalRecords)}{" "}
                  of {totalRecords}
                </span>
                {totalRecords > DRILL_PAGE_SIZE && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDrillPage((p) => p - 1)}
                      disabled={drillPage === 0}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDrillPage((p) => p + 1)}
                      disabled={(drillPage + 1) * DRILL_PAGE_SIZE >= totalRecords}
                      className="gap-1"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Demo Meetings Modal — PEXA only */}
      {demoModalSdr && isPexa && (
        <DemoMeetingsModal
          isOpen={!!demoModalSdr}
          onClose={() => setDemoModalSdr(null)}
          sdrName={demoModalSdr.sdrName}
          clientId="pexa-clear"
          dateRange={demoModalSdr.dateRange}
        />
      )}

      {/* Mobile Filter Drawer */}
      <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Filters</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-2 space-y-5 overflow-y-auto">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Client
              </label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-full min-h-[44px] bg-[#0f172a] text-white border-[#0f172a] dark:bg-white dark:text-[#0f172a] dark:border-white font-semibold">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent className="z-[200] bg-card">
                  <SelectItem value="all">All Clients</SelectItem>
                  {clientOptions.map((c) => (
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

            {mode === "historical" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Period
                  </label>
                  <Tabs
                    value={dateMode}
                    onValueChange={(v) => {
                      const dm = v as DateMode;
                      setDateMode(dm);
                      if (dm === "week" || dm === "month") setTimeRange([0, 24]);
                      else setTimeRange([9, 17]);
                    }}
                  >
                    <TabsList className="bg-muted/50 w-full">
                      <TabsTrigger
                        value="day"
                        className="flex-1 data-[state=active]:bg-[#0f172a] data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-[#0f172a]"
                      >
                        Day
                      </TabsTrigger>
                      <TabsTrigger
                        value="week"
                        className="flex-1 data-[state=active]:bg-[#0f172a] data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-[#0f172a]"
                      >
                        Week
                      </TabsTrigger>
                      <TabsTrigger
                        value="month"
                        className="flex-1 data-[state=active]:bg-[#0f172a] data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-[#0f172a]"
                      >
                        Month
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    {dateMode === "day" ? "Date" : dateMode === "week" ? "Week" : "Month"}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigateDate("prev")}
                      className="flex items-center justify-center shrink-0 bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a] rounded-md border border-white/20 dark:border-gray-300"
                      style={{ width: 36, height: 40 }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="flex-1 text-center text-sm font-medium text-foreground bg-muted/50 rounded-md py-2.5 px-3">
                      {dateMode === "day" ? format(histDate, "EEE, MMM d, yyyy") : dateRangeInfo.label}
                    </div>
                    <button
                      onClick={() => navigateDate("next")}
                      className="flex items-center justify-center shrink-0 bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a] rounded-md border border-white/20 dark:border-gray-300"
                      style={{ width: 36, height: 40 }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {dateMode === "day" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      Time Range
                    </label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={String(timeRange[0])}
                        onValueChange={(v) => setTimeRange([parseInt(v), timeRange[1]])}
                      >
                        <SelectTrigger className="h-[34px] flex-1 bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a] border-white/20 dark:border-gray-300 text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={String(i)}>
                              {formatHour(i)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs font-semibold text-muted-foreground">→</span>
                      <Select
                        value={String(timeRange[1])}
                        onValueChange={(v) => setTimeRange([timeRange[0], parseInt(v)])}
                      >
                        <SelectTrigger className="h-[34px] flex-1 bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a] border-white/20 dark:border-gray-300 text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                            <SelectItem key={h} value={String(h)}>
                              {h === 24 ? "11:59 PM" : formatHour(h)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap ml-3">
                        · {timeRange[1] - timeRange[0]} hrs selected
                      </span>
                    </div>
                  </div>
                )}

                {dateMode !== "day" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      Days
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_DAYS.map((day) => (
                        <button
                          key={day}
                          onClick={() => toggleWeekday(day)}
                          className={cn(
                            "font-semibold rounded-lg text-xs h-[34px] px-2.5 transition-colors",
                            selectedWeekdays.includes(day)
                              ? "bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a]"
                              : "bg-transparent text-[#94a3b8] border border-[#e2e8f0] dark:border-white/10",
                          )}
                        >
                          {day.substring(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DrawerFooter>
            <Button
              className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100"
              onClick={() => {
                if (mode === "historical") setHistApplied(true);
                setFilterDrawerOpen(false);
              }}
            >
              Apply
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default ActivityMonitor;
