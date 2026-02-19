import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, PhoneIncoming, Percent, Target, CalendarIcon, ArrowUpDown, Clock, ChevronLeft, ChevronRight, Play, Square, Volume2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/lib/supabase";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { format, formatDistanceToNow, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, subWeeks, addMonths, subMonths, eachDayOfInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { SDRAvatar } from "@/components/SDRAvatar";

type Mode = "live" | "historical";
type SortKey = "sdrName" | "clientId" | "dials" | "answered" | "answerRate" | "sqls" | "conversion";
type SortDir = "asc" | "desc";
type DrillMetric = "answered" | "sqls";
type DateMode = "day" | "week" | "month";
type TimePreset = "fullday" | "morning" | "afternoon" | "custom";

interface SqlMeetingRow {
  id: string;
  sdr_name: string | null;
  contact_person: string;
  company_name: string | null;
  booking_date: string;
  meeting_date: string | null;
  created_at: string | null;
  recording_url?: string | null;
  call_duration?: number | null;
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
  meeting_scheduled_date: string | null;
  client_id: string | null;
  recording_url: string | null;
}

interface SDRRow {
  sdrName: string;
  clientId: string;
  dials: number;
  answered: number;
  answerRate: number;
  sqls: number;
  conversion: number;
  lastActivity: Date | null;
}

const formatHour = (h: number) => {
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
};

const getMelbourneToday = () => {
  const now = new Date();
  const melb = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = melb.find(p => p.type === "year")!.value;
  const m = melb.find(p => p.type === "month")!.value;
  const d = melb.find(p => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
};

const TIME_PRESETS: { key: TimePreset; label: string; range: [number, number] }[] = [
  { key: "fullday", label: "Full Day", range: [0, 24] },
  { key: "morning", label: "Morning", range: [6, 12] },
  { key: "afternoon", label: "Afternoon", range: [12, 18] },
  { key: "custom", label: "Custom", range: [0, 24] },
];

const ActivityMonitor = () => {
  const [mode, setMode] = useState<Mode>("live");
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

  useEffect(() => {
    const fetchPhotos = async () => {
      const { data: members } = await supabase
        .from("team_members")
        .select("sdr_name, profile_photo_url");
      if (members) {
        const map: Record<string, string | null> = {};
        for (const m of members) map[m.sdr_name] = m.profile_photo_url;
        setSdrPhotoMap(map);
      }
    };
    fetchPhotos();
  }, []);

  // Historical filters
  const [histDate, setHistDate] = useState<Date>(new Date());
  const [timeRange, setTimeRange] = useState<number[]>([0, 24]);
  const [timePreset, setTimePreset] = useState<TimePreset>("fullday");
  const [histApplied, setHistApplied] = useState(false);
  const [histSqlMeetings, setHistSqlMeetings] = useState<SqlMeetingRow[]>([]);
  const [dateMode, setDateMode] = useState<DateMode>("day");

  const todayMelbourne = useMemo(getMelbourneToday, []);
  const todayFormatted = useMemo(() => {
    const d = new Date(todayMelbourne + "T00:00:00");
    return format(d, "EEEE, MMMM d, yyyy");
  }, [todayMelbourne]);

  // Compute date range based on dateMode
  const dateRangeInfo = useMemo(() => {
    if (dateMode === "day") {
      const dateStr = format(histDate, "yyyy-MM-dd");
      return { dates: [dateStr], label: format(histDate, "EEEE, MMMM d, yyyy") };
    } else if (dateMode === "week") {
      const weekStart = startOfWeek(histDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(histDate, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      return {
        dates: days.map(d => format(d, "yyyy-MM-dd")),
        label: `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`,
      };
    } else {
      const monthStart = startOfMonth(histDate);
      const monthEnd = endOfMonth(histDate);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
      return {
        dates: days.map(d => format(d, "yyyy-MM-dd")),
        label: format(histDate, "MMMM yyyy"),
      };
    }
  }, [histDate, dateMode]);

  // LIVE fetch
  const fetchLiveData = useCallback(async () => {
    if (mode !== "live") return;
    setLoading(true);
    try {
      const [snapshotRes, activityRes] = await Promise.all([
        supabase
          .from("daily_snapshots")
          .select("sdr_name, client_id, dials, answered, dms_reached, sqls, answer_rate")
          .eq("snapshot_date", todayMelbourne),
        supabase
          .from("activity_log")
          .select("id, sdr_name, activity_date, contact_name, company_name, call_outcome, call_duration, activity_type, is_sql, meeting_scheduled_date, client_id, recording_url")
          .gte("activity_date", todayMelbourne + "T00:00:00")
          .lte("activity_date", todayMelbourne + "T23:59:59")
          .order("activity_date", { ascending: false }),
      ]);
      if (snapshotRes.data) setSnapshots(snapshotRes.data);
      if (activityRes.data) setActivities(activityRes.data);
    } catch (err) {
      console.error("Error fetching live data:", err);
    } finally {
      setLoading(false);
    }
  }, [todayMelbourne, mode]);

  // Helper to fetch all rows with pagination (bypasses 1000-row default limit)
  const fetchAllRows = async <T,>(
    tableName: string,
    selectCols: string,
    filters: (query: any) => any,
    orderCol?: string
  ): Promise<T[]> => {
    const PAGE_SIZE = 1000;
    let allData: T[] = [];
    let from = 0;
    let hasMore = true;
    while (hasMore) {
      let query = supabase.from(tableName).select(selectCols).range(from, from + PAGE_SIZE - 1);
      query = filters(query);
      if (orderCol) query = query.order(orderCol, { ascending: false });
      const { data, error } = await query;
      if (error) { console.error(`Fetch error ${tableName}:`, error); break; }
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
      const startHour = String(timeRange[0]).padStart(2, "0");
      const endTs = timeRange[1] === 24 ? "23:59:59" : `${String(timeRange[1]).padStart(2, "0")}:00:00`;

      const firstDate = dates[0];
      const lastDate = dates[dates.length - 1];
      const startTimestamp = `${firstDate}T${startHour}:00:00`;
      const endTimestamp = `${lastDate}T${endTs}`;

      console.log("📊 Historical query:", { startTimestamp, endTimestamp, dates });

      const activityCols = "id, sdr_name, activity_date, contact_name, company_name, call_outcome, call_duration, activity_type, is_sql, meeting_scheduled_date, client_id, recording_url";

      const [activityData, sqlRes, snapshotRes] = await Promise.all([
        fetchAllRows<ActivityRow>("activity_log", activityCols, (q: any) =>
          q.gte("activity_date", startTimestamp).lte("activity_date", endTimestamp),
          "activity_date"
        ),
        supabase
          .from("sql_meetings")
          .select("id, sdr_name, contact_person, company_name, booking_date, meeting_date, created_at, client_id")
          .gte("created_at", startTimestamp)
          .lte("created_at", endTimestamp),
        supabase
          .from("daily_snapshots")
          .select("sdr_name, client_id, dms_reached")
          .gte("snapshot_date", firstDate)
          .lte("snapshot_date", lastDate),
      ]);

      console.log("📊 Historical results:", {
        activities: activityData.length,
        sqlMeetings: sqlRes.data?.length,
        snapshots: snapshotRes.data?.length,
        error: sqlRes.error || snapshotRes.error,
      });

      setActivities(activityData);
      setHistSqlMeetings(sqlRes.data || []);
      setSnapshots(snapshotRes.data?.map(s => ({ ...s, dials: null, answered: null, sqls: null, answer_rate: null })) || []);
    } catch (err) {
      console.error("Error fetching historical data:", err);
    } finally {
      setLoading(false);
    }
  }, [dateRangeInfo, timeRange, mode]);

  useEffect(() => {
    document.title = "J2 Dashboard - Activity Monitor";
    if (mode === "live") {
      fetchLiveData();
    }
  }, [mode, fetchLiveData]);

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

  // Only subscribe in live mode
  useRealtimeSubscription({
    table: "daily_snapshots",
    onChange: mode === "live" ? fetchLiveData : undefined,
  });
  useRealtimeSubscription({
    table: "activity_log",
    onChange: mode === "live" ? fetchLiveData : undefined,
  });

  // KPI totals
  const totals = useMemo(() => {
    if (mode === "historical") {
      const dials = activities.length;
      const answered = activities.filter(a => a.call_outcome?.toLowerCase() === "connected").length;
      const sqls = histSqlMeetings.length;
      return { dials, answered, sqls };
    }
    return snapshots.reduce(
      (acc, s) => ({
        dials: acc.dials + (s.dials || 0),
        answered: acc.answered + (s.answered || 0),
        sqls: acc.sqls + (s.sqls || 0),
      }),
      { dials: 0, answered: 0, sqls: 0 }
    );
  }, [snapshots, activities, histSqlMeetings, mode]);

  // SDR rows
  const sdrRows = useMemo(() => {
    const map = new Map<string, SDRRow>();

    if (mode === "live") {
      for (const s of snapshots) {
        if (!s.sdr_name) continue;
        const existing = map.get(s.sdr_name);
        if (existing) {
          existing.dials += s.dials || 0;
          existing.answered += s.answered || 0;
          existing.sqls += s.sqls || 0;
        } else {
          map.set(s.sdr_name, {
            sdrName: s.sdr_name,
            clientId: s.client_id || "",
            dials: s.dials || 0,
            answered: s.answered || 0,
            answerRate: 0,
            sqls: s.sqls || 0,
            conversion: 0,
            lastActivity: null,
          });
        }
      }
    } else {
      const sqlCountBySdr = new Map<string, number>();
      for (const m of histSqlMeetings) {
        if (!m.sdr_name) continue;
        sqlCountBySdr.set(m.sdr_name, (sqlCountBySdr.get(m.sdr_name) || 0) + 1);
      }

      const allSdrNames = new Set<string>();
      for (const a of activities) if (a.sdr_name) allSdrNames.add(a.sdr_name);
      for (const name of sqlCountBySdr.keys()) allSdrNames.add(name);

      for (const sdrName of allSdrNames) {
        const sdrActivities = activities.filter(a => a.sdr_name === sdrName);
        const clientId = sdrActivities[0]?.client_id || "";
        map.set(sdrName, {
          sdrName,
          clientId: typeof clientId === "string" ? clientId : "",
          dials: sdrActivities.length,
          answered: sdrActivities.filter(a => a.call_outcome?.toLowerCase() === "connected").length,
          answerRate: 0,
          sqls: sqlCountBySdr.get(sdrName) || 0,
          conversion: 0,
          lastActivity: null,
        });
      }
    }

    // Attach last activity
    for (const a of activities) {
      if (!a.sdr_name) continue;
      const row = map.get(a.sdr_name);
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

    const rows = Array.from(map.values());
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "sdrName") cmp = a.sdrName.localeCompare(b.sdrName);
      else if (sortKey === "clientId") cmp = a.clientId.localeCompare(b.clientId);
      else cmp = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === "desc" ? -cmp : cmp;
    });

    return rows;
  }, [snapshots, activities, histSqlMeetings, mode, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // Drill-down
  const handleDrillDown = async (sdrName: string, metric: DrillMetric) => {
    setDrillDown({ sdrName, metric });
    setLoadingDrill(true);
    setDrillDownData([]);
    setDrillDownSqlData([]);
    try {
      if (metric === "answered") {
        let startTimestamp: string;
        let endTimestamp: string;

        if (mode === "live") {
          startTimestamp = `${todayMelbourne}T00:00:00`;
          endTimestamp = `${todayMelbourne}T23:59:59`;
        } else {
          const dates = dateRangeInfo.dates;
          const startHour = String(timeRange[0]).padStart(2, "0");
          const endTs = timeRange[1] === 24 ? "23:59:59" : `${String(timeRange[1]).padStart(2, "0")}:00:00`;
          startTimestamp = `${dates[0]}T${startHour}:00:00`;
          endTimestamp = `${dates[dates.length - 1]}T${endTs}`;
        }

        const { data } = await supabase
          .from("activity_log")
          .select("id, sdr_name, activity_date, contact_name, company_name, call_outcome, call_duration, activity_type, is_sql, meeting_scheduled_date, client_id, recording_url")
          .eq("sdr_name", sdrName)
          .ilike("call_outcome", "connected")
          .gte("activity_date", startTimestamp)
          .lte("activity_date", endTimestamp)
          .order("activity_date", { ascending: false });

        setDrillDownData(data || []);
      } else if (metric === "sqls") {
        let startTimestamp: string;
        let endTimestamp: string;

        if (mode === "live") {
          startTimestamp = `${todayMelbourne}T00:00:00`;
          endTimestamp = `${todayMelbourne}T23:59:59`;
        } else {
          const dates = dateRangeInfo.dates;
          const startHour = String(timeRange[0]).padStart(2, "0");
          const endTs = timeRange[1] === 24 ? "23:59:59" : `${String(timeRange[1]).padStart(2, "0")}:00:00`;
          startTimestamp = `${dates[0]}T${startHour}:00:00`;
          endTimestamp = `${dates[dates.length - 1]}T${endTs}`;
        }

        const { data: sqlData } = await supabase
          .from("sql_meetings")
          .select("id, sdr_name, contact_person, company_name, booking_date, meeting_date, created_at, contact_email")
          .eq("sdr_name", sdrName)
          .gte("created_at", startTimestamp)
          .lte("created_at", endTimestamp)
          .order("created_at", { ascending: false });

        // For each SQL, try to find an associated call recording
        const enrichedSqlData: SqlMeetingRow[] = [];
        if (sqlData) {
          for (const sql of sqlData) {
            let recording_url: string | null = null;
            let call_duration: number | null = null;
            if (sql.contact_email) {
              const { data: callData } = await supabase
                .from("activity_log")
                .select("recording_url, call_duration")
                .eq("sdr_name", sdrName)
                .eq("contact_email", sql.contact_email)
                .ilike("call_outcome", "connected")
                .not("recording_url", "is", null)
                .order("call_duration", { ascending: false })
                .limit(1);
              if (callData && callData.length > 0) {
                recording_url = callData[0].recording_url;
                call_duration = callData[0].call_duration;
              }
            }
            enrichedSqlData.push({
              ...sql,
              recording_url,
              call_duration,
            });
          }
        }
        setDrillDownSqlData(enrichedSqlData);
      }
    } catch (err) {
      console.error("Drill-down error:", err);
    } finally {
      setLoadingDrill(false);
    }
  };

  const isRecentActivity = (lastActivity: Date | null) => {
    if (!lastActivity) return false;
    return Date.now() - lastActivity.getTime() < 5 * 60 * 1000;
  };

  const handleTimePreset = (preset: TimePreset) => {
    setTimePreset(preset);
    if (preset !== "custom") {
      const found = TIME_PRESETS.find(p => p.key === preset);
      if (found) setTimeRange([...found.range]);
    }
  };

  const navigateDate = (direction: "prev" | "next") => {
    if (dateMode === "day") {
      setHistDate(d => direction === "next" ? new Date(d.getTime() + 86400000) : new Date(d.getTime() - 86400000));
    } else if (dateMode === "week") {
      setHistDate(d => direction === "next" ? addWeeks(d, 1) : subWeeks(d, 1));
    } else {
      setHistDate(d => direction === "next" ? addMonths(d, 1) : subMonths(d, 1));
    }
  };

  const answerRateDisplay = totals.dials > 0 ? ((totals.answered / totals.dials) * 100).toFixed(1) + "%" : "0.0%";

  // Calculate avg call duration for connected calls
  const avgCallDuration = useMemo(() => {
    const connected = activities.filter(a => a.call_outcome?.toLowerCase() === "connected" && a.call_duration && a.call_duration > 0);
    if (connected.length === 0) return "0m 0s";
    const avg = connected.reduce((sum, a) => sum + (a.call_duration || 0), 0) / connected.length;
    return `${Math.floor(avg / 60)}m ${Math.round(avg % 60)}s`;
  }, [activities]);

  const kpiCards = [
    { label: "Total Dials", value: totals.dials.toLocaleString(), icon: Phone, color: "text-blue-500" },
    { label: "Total Answered", value: totals.answered.toLocaleString(), icon: PhoneIncoming, color: "text-green-500" },
    { label: "Avg Answer Rate", value: answerRateDisplay, icon: Percent, color: "text-purple-500" },
    { label: "Total SQLs", value: totals.sqls.toLocaleString(), icon: Target, color: "text-secondary" },
    { label: "Avg Call Duration", value: avgCallDuration, icon: Clock, color: "text-cyan-500" },
  ];

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground"
      onClick={() => toggleSort(sortKeyName)}
    >
      {label}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {mode === "live" ? "Today's Activity" : "Performance Analysis"}
          </h1>
          <p className="text-muted-foreground">
            {mode === "live" ? todayFormatted : dateRangeInfo.label}
          </p>
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
                  ? "bg-green-500/15 text-green-500 border-r border-border"
                  : "bg-card text-muted-foreground hover:text-foreground border-r border-border"
              )}
            >
              Live Today
            </button>
            <button
              onClick={() => setMode("historical")}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                mode === "historical"
                  ? "bg-blue-500/15 text-blue-500"
                  : "bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              Historical View
            </button>
          </div>
        </div>
      </div>

      {/* Historical Filters */}
      {mode === "historical" && (
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardContent className="pt-6 space-y-4">
            {/* Date Mode Tabs */}
            <Tabs value={dateMode} onValueChange={(v) => setDateMode(v as DateMode)}>
              <TabsList className="bg-muted/50">
                <TabsTrigger value="day">Single Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
              {/* Date selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {dateMode === "day" ? "Date" : dateMode === "week" ? "Week" : "Month"}
                </label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navigateDate("prev")}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {dateMode === "day" ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(histDate, "MMM d, yyyy")}
                        </Button>
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
                    <div className="px-4 py-2 border border-border rounded-md bg-card text-sm font-medium min-w-[200px] text-center">
                      {dateRangeInfo.label}
                    </div>
                  )}
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navigateDate("next")}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Time Range Section (only for single day) */}
              {dateMode === "day" && (
                <div className="flex-1 space-y-3 w-full">
                  {/* Time Presets */}
                  <div className="flex flex-wrap gap-2">
                    {TIME_PRESETS.map((preset) => (
                      <Button
                        key={preset.key}
                        variant={timePreset === preset.key ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleTimePreset(preset.key)}
                        className={cn(
                          "text-xs",
                          timePreset === preset.key && "bg-blue-500 hover:bg-blue-600 text-white"
                        )}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>

                  {/* Custom slider */}
                  {timePreset === "custom" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          Time Range
                        </label>
                        <span className="text-sm font-medium text-foreground">
                          {formatHour(timeRange[0])} – {timeRange[1] === 24 ? "11:59 PM" : formatHour(timeRange[1])}
                        </span>
                      </div>
                      <Slider
                        min={0}
                        max={24}
                        step={1}
                        value={timeRange}
                        onValueChange={setTimeRange}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>12 AM</span>
                        <span>6 AM</span>
                        <span>12 PM</span>
                        <span>6 PM</span>
                        <span>12 AM</span>
                      </div>
                    </div>
                  )}

                  {timePreset !== "custom" && (
                    <p className="text-xs text-muted-foreground">
                      {formatHour(timeRange[0])} – {timeRange[1] === 24 ? "11:59 PM" : formatHour(timeRange[1])}
                    </p>
                  )}
                </div>
              )}

              {/* Apply */}
              <Button
                onClick={() => setHistApplied(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SDR Table */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle>SDR Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : sdrRows.length === 0 ? (
            <EmptyState
              icon={mode === "live" ? Phone : CalendarIcon}
              title={mode === "live" ? "No activity recorded yet" : "No activity found"}
              description={mode === "live" ? "Calls will appear here once SDRs start dialing. Check back later!" : "Try adjusting the date or time range to find activity data."}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead><SortHeader label="SDR Name" sortKeyName="sdrName" /></TableHead>
                    <TableHead><SortHeader label="Client" sortKeyName="clientId" /></TableHead>
                    <TableHead className="text-center"><SortHeader label="Dials" sortKeyName="dials" /></TableHead>
                    <TableHead className="text-center"><SortHeader label="Answered" sortKeyName="answered" /></TableHead>
                    <TableHead className="text-center"><SortHeader label="Answer Rate" sortKeyName="answerRate" /></TableHead>
                    <TableHead className="text-center"><SortHeader label="SQLs" sortKeyName="sqls" /></TableHead>
                    <TableHead className="text-center"><SortHeader label="Conversion Rate" sortKeyName="conversion" /></TableHead>
                    {mode === "live" && <TableHead className="text-right">Last Activity</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sdrRows.map((row) => {
                    const recent = mode === "live" && isRecentActivity(row.lastActivity);
                    return (
                      <TableRow
                        key={row.sdrName}
                        className={cn(
                          "border-border/50 transition-all",
                          recent && "bg-green-500/5 shadow-[inset_0_0_20px_rgba(34,197,94,0.05)]"
                        )}
                      >
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <SDRAvatar name={row.sdrName} photoUrl={sdrPhotoMap[row.sdrName]} size="sm" />
                            {row.sdrName}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.clientId}</TableCell>
                        <TableCell className="text-center font-semibold text-foreground">{row.dials}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="font-semibold text-foreground hover:text-secondary"
                            onClick={() => handleDrillDown(row.sdrName, "answered")}
                          >
                            {row.answered}
                          </Button>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {row.answerRate.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="font-bold text-secondary hover:text-secondary/80"
                            onClick={() => handleDrillDown(row.sdrName, "sqls")}
                          >
                            {row.sqls}
                          </Button>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {row.conversion.toFixed(1)}%
                        </TableCell>
                        {mode === "live" && (
                          <TableCell className="text-right text-muted-foreground text-sm">
                            {row.lastActivity ? (
                              <span className={recent ? "text-green-500 font-medium" : ""}>
                                {formatDistanceToNow(row.lastActivity, { addSuffix: true })}
                              </span>
                            ) : "—"}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drill-down Modal */}
      <Dialog open={!!drillDown} onOpenChange={(open) => { if (!open) { setDrillDown(null); setPlayingRecordingId(null); } }}>
        <DialogContent className="bg-card border-border sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {drillDown?.sdrName} — {drillDown?.metric === "answered" ? "Connected Calls" : "SQL Meetings"}
            </DialogTitle>
          </DialogHeader>
          {loadingDrill ? (
            <div className="space-y-3 py-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : drillDown?.metric === "answered" ? (
            drillDownData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No connected calls found for this SDR in the selected time range.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Time</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                      <TableHead className="text-center">Recording</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drillDownData.map((a) => (
                      <>
                        <TableRow key={a.id} className="border-border/50">
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(a.activity_date).toLocaleTimeString("en-AU", { timeZone: "Australia/Melbourne", hour: "numeric", minute: "2-digit", hour12: true })}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">{a.contact_name || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{a.company_name || "—"}</TableCell>
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
                              <span className="text-muted-foreground">—</span>
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
                                  <><Square className="h-3 w-3 mr-1" /> Stop</>
                                ) : (
                                  <><Play className="h-3 w-3 mr-1" /> Play</>
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
                                  <p className="text-xs text-muted-foreground mb-1.5">Call Recording — {a.contact_name || "Unknown"}</p>
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
          ) : (
            drillDownSqlData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No SQLs booked for this SDR in the selected time range.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Time Booked</TableHead>
                      <TableHead>Contact Person</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Meeting Date</TableHead>
                      <TableHead className="text-center">Recording</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drillDownSqlData.map((m) => (
                      <>
                        <TableRow key={m.id} className="border-border/50">
                          <TableCell className="text-muted-foreground text-sm">
                            {m.created_at
                              ? new Date(m.created_at).toLocaleTimeString("en-AU", { timeZone: "Australia/Melbourne", hour: "numeric", minute: "2-digit", hour12: true })
                              : format(new Date(m.booking_date), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">{m.contact_person || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{m.company_name || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {m.meeting_date ? format(new Date(m.meeting_date), "MMM d, yyyy") : "—"}
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
                                  <><Square className="h-3 w-3 mr-1" /> Stop</>
                                ) : (
                                  <><Play className="h-3 w-3 mr-1" /> Play</>
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
                                  <p className="text-xs text-muted-foreground mb-1.5">SQL Call Recording — {m.contact_person || "Unknown"}</p>
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActivityMonitor;
