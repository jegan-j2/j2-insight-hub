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
import { Phone, PhoneIncoming, Users, Target, CalendarIcon, ArrowUpDown, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type Mode = "live" | "historical";
type SortKey = "sdrName" | "clientId" | "dials" | "answered" | "answerRate" | "dms" | "sqls";
type SortDir = "asc" | "desc";
type DrillMetric = "answered" | "sqls";

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
}

interface SDRRow {
  sdrName: string;
  clientId: string;
  dials: number;
  answered: number;
  answerRate: number;
  dms: number;
  sqls: number;
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
  const [loadingDrill, setLoadingDrill] = useState(false);

  // Historical filters
  const [histDate, setHistDate] = useState<Date>(new Date());
  const [timeRange, setTimeRange] = useState<number[]>([0, 24]);
  const [histApplied, setHistApplied] = useState(false);

  const todayMelbourne = useMemo(getMelbourneToday, []);
  const todayFormatted = useMemo(() => {
    const d = new Date(todayMelbourne + "T00:00:00");
    return format(d, "EEEE, MMMM d, yyyy");
  }, [todayMelbourne]);

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
          .select("id, sdr_name, activity_date, contact_name, company_name, call_outcome, call_duration, activity_type, is_sql, meeting_scheduled_date")
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

  // HISTORICAL fetch
  const fetchHistoricalData = useCallback(async () => {
    if (mode !== "historical") return;
    setLoading(true);
    try {
      const dateStr = format(histDate, "yyyy-MM-dd");
      const startHour = String(timeRange[0]).padStart(2, "0");
      const endHour = timeRange[1] === 24 ? "23:59:59" : `${String(timeRange[1]).padStart(2, "0")}:00:00`;
      const startTs = `${dateStr}T${startHour}:00:00`;
      const endTs = `${dateStr}T${endHour}`;

      const [snapshotRes, activityRes] = await Promise.all([
        supabase
          .from("daily_snapshots")
          .select("sdr_name, client_id, dials, answered, dms_reached, sqls, answer_rate")
          .eq("snapshot_date", dateStr),
        supabase
          .from("activity_log")
          .select("id, sdr_name, activity_date, contact_name, company_name, call_outcome, call_duration, activity_type, is_sql, meeting_scheduled_date")
          .gte("activity_date", startTs)
          .lte("activity_date", endTs)
          .order("activity_date", { ascending: false }),
      ]);
      if (snapshotRes.data) setSnapshots(snapshotRes.data);
      if (activityRes.data) setActivities(activityRes.data);
    } catch (err) {
      console.error("Error fetching historical data:", err);
    } finally {
      setLoading(false);
    }
  }, [histDate, timeRange, mode]);

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
      // Aggregate from activity_log for historical with time filters
      const dials = activities.length;
      const answered = activities.filter(a => a.call_outcome === "Connected").length;
      const dms = activities.filter(a => a.activity_type === "DM" || a.call_outcome === "DM Reached").length;
      const sqls = activities.filter(a => a.is_sql).length;
      return { dials, answered, dms, sqls };
    }
    return snapshots.reduce(
      (acc, s) => ({
        dials: acc.dials + (s.dials || 0),
        answered: acc.answered + (s.answered || 0),
        dms: acc.dms + (s.dms_reached || 0),
        sqls: acc.sqls + (s.sqls || 0),
      }),
      { dials: 0, answered: 0, dms: 0, sqls: 0 }
    );
  }, [snapshots, activities, mode]);

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
          existing.dms += s.dms_reached || 0;
          existing.sqls += s.sqls || 0;
        } else {
          map.set(s.sdr_name, {
            sdrName: s.sdr_name,
            clientId: s.client_id || "",
            dials: s.dials || 0,
            answered: s.answered || 0,
            answerRate: 0,
            dms: s.dms_reached || 0,
            sqls: s.sqls || 0,
            lastActivity: null,
          });
        }
      }
    } else {
      // Aggregate from activity_log for historical
      for (const a of activities) {
        if (!a.sdr_name) continue;
        const existing = map.get(a.sdr_name);
        if (existing) {
          existing.dials += 1;
          if (a.call_outcome === "Connected") existing.answered += 1;
          if (a.activity_type === "DM" || a.call_outcome === "DM Reached") existing.dms += 1;
          if (a.is_sql) existing.sqls += 1;
        } else {
          map.set(a.sdr_name, {
            sdrName: a.sdr_name,
            clientId: "",
            dials: 1,
            answered: a.call_outcome === "Connected" ? 1 : 0,
            answerRate: 0,
            dms: (a.activity_type === "DM" || a.call_outcome === "DM Reached") ? 1 : 0,
            sqls: a.is_sql ? 1 : 0,
            lastActivity: null,
          });
        }
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

    // Recalculate answer rate
    for (const row of map.values()) {
      row.answerRate = row.dials > 0 ? (row.answered / row.dials) * 100 : 0;
    }

    const rows = Array.from(map.values());

    // Sort
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "sdrName") cmp = a.sdrName.localeCompare(b.sdrName);
      else if (sortKey === "clientId") cmp = a.clientId.localeCompare(b.clientId);
      else cmp = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === "desc" ? -cmp : cmp;
    });

    return rows;
  }, [snapshots, activities, mode, sortKey, sortDir]);

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
    try {
      const dateStr = mode === "live" ? todayMelbourne : format(histDate, "yyyy-MM-dd");
      const startHour = mode === "historical" ? String(timeRange[0]).padStart(2, "0") : "00";
      const endTs = mode === "historical"
        ? (timeRange[1] === 24 ? "23:59:59" : `${String(timeRange[1]).padStart(2, "0")}:00:00`)
        : "23:59:59";

      let query = supabase
        .from("activity_log")
        .select("id, sdr_name, activity_date, contact_name, company_name, call_outcome, call_duration, activity_type, is_sql, meeting_scheduled_date")
        .eq("sdr_name", sdrName)
        .gte("activity_date", `${dateStr}T${startHour}:00:00`)
        .lte("activity_date", `${dateStr}T${endTs}`)
        .order("activity_date", { ascending: false });

      if (metric === "answered") {
        query = query.eq("call_outcome", "Connected");
      } else if (metric === "sqls") {
        query = query.eq("is_sql", true);
      }

      const { data } = await query;
      setDrillDownData(data || []);
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

  const kpiCards = [
    { label: "Total Dials", value: totals.dials, icon: Phone, color: "text-blue-500" },
    { label: "Total Answered", value: totals.answered, icon: PhoneIncoming, color: "text-green-500" },
    { label: "Total DMs", value: totals.dms, icon: Users, color: "text-purple-500" },
    { label: "Total SQLs", value: totals.sqls, icon: Target, color: "text-secondary" },
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
            {mode === "live" ? todayFormatted : format(histDate, "EEEE, MMMM d, yyyy")}
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
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
              {/* Date picker */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Date</label>
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
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time range slider */}
              <div className="flex-1 space-y-2 w-full">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                <p className="text-3xl font-bold text-foreground">{kpi.value.toLocaleString()}</p>
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
            <div className="text-center py-12 text-muted-foreground">
              <Phone className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">
                {mode === "live" ? "No activity yet today" : "No activity found for selected time range"}
              </p>
              <p className="text-sm">
                {mode === "live" ? "Activity will appear when calls start." : "Try adjusting the date or time range."}
              </p>
            </div>
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
                    <TableHead className="text-center"><SortHeader label="DMs" sortKeyName="dms" /></TableHead>
                    <TableHead className="text-center"><SortHeader label="SQLs" sortKeyName="sqls" /></TableHead>
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
                        <TableCell className="font-medium text-foreground">{row.sdrName}</TableCell>
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
                        <TableCell className="text-center text-foreground">{row.dms}</TableCell>
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
      <Dialog open={!!drillDown} onOpenChange={(open) => !open && setDrillDown(null)}>
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
          ) : drillDownData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Time</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Company</TableHead>
                    {drillDown?.metric === "answered" ? (
                      <>
                        <TableHead>Outcome</TableHead>
                        <TableHead className="text-right">Duration</TableHead>
                      </>
                    ) : (
                      <TableHead>Meeting Date</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drillDownData.map((a) => (
                    <TableRow key={a.id} className="border-border/50">
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(a.activity_date), "h:mm a")}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{a.contact_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{a.company_name || "—"}</TableCell>
                      {drillDown?.metric === "answered" ? (
                        <>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{a.call_outcome || "—"}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {a.call_duration ? `${Math.floor(a.call_duration / 60)}:${String(a.call_duration % 60).padStart(2, "0")}` : "—"}
                          </TableCell>
                        </>
                      ) : (
                        <TableCell className="text-muted-foreground">
                          {a.meeting_scheduled_date ? format(new Date(a.meeting_scheduled_date), "MMM d, yyyy") : "—"}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActivityMonitor;
