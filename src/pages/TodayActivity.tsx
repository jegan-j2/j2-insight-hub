import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, PhoneIncoming, Users, Target, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { format, formatDistanceToNow } from "date-fns";

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

interface DrillDownState {
  sdrName: string;
  metric: "dials" | "answered";
}

const TodayActivity = () => {
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<DrillDownState | null>(null);
  const [drillDownActivities, setDrillDownActivities] = useState<ActivityRow[]>([]);
  const [loadingDrillDown, setLoadingDrillDown] = useState(false);

  // Melbourne timezone date
  const todayMelbourne = useMemo(() => {
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
  }, []);

  const todayFormatted = useMemo(() => {
    const d = new Date(todayMelbourne + "T00:00:00");
    return format(d, "EEEE, MMMM d, yyyy");
  }, [todayMelbourne]);

  const fetchData = useCallback(async () => {
    try {
      const [snapshotRes, activityRes] = await Promise.all([
        supabase
          .from("daily_snapshots")
          .select("sdr_name, client_id, dials, answered, dms_reached, sqls, answer_rate")
          .eq("snapshot_date", todayMelbourne),
        supabase
          .from("activity_log")
          .select("id, sdr_name, activity_date, contact_name, company_name, call_outcome, call_duration, activity_type")
          .gte("activity_date", todayMelbourne + "T00:00:00")
          .lte("activity_date", todayMelbourne + "T23:59:59")
          .order("activity_date", { ascending: false }),
      ]);

      if (snapshotRes.data) setSnapshots(snapshotRes.data);
      if (activityRes.data) setActivities(activityRes.data);
    } catch (err) {
      console.error("Error fetching today's data:", err);
    } finally {
      setLoading(false);
    }
  }, [todayMelbourne]);

  useEffect(() => {
    document.title = "J2 Dashboard - Today's Activity";
    fetchData();
  }, [fetchData]);

  useRealtimeSubscription({
    table: "daily_snapshots",
    onChange: fetchData,
  });

  useRealtimeSubscription({
    table: "activity_log",
    onChange: fetchData,
  });

  // Aggregate KPI totals
  const totals = useMemo(() => {
    return snapshots.reduce(
      (acc, s) => ({
        dials: acc.dials + (s.dials || 0),
        answered: acc.answered + (s.answered || 0),
        dms: acc.dms + (s.dms_reached || 0),
        sqls: acc.sqls + (s.sqls || 0),
      }),
      { dials: 0, answered: 0, dms: 0, sqls: 0 }
    );
  }, [snapshots]);

  // Build SDR rows with last activity
  const sdrRows = useMemo(() => {
    const map = new Map<string, SDRRow>();

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
          answerRate: s.answer_rate || 0,
          dms: s.dms_reached || 0,
          sqls: s.sqls || 0,
          lastActivity: null,
        });
      }
    }

    // Attach last activity time from activity_log
    for (const a of activities) {
      if (!a.sdr_name) continue;
      const row = map.get(a.sdr_name);
      if (row) {
        const actDate = new Date(a.activity_date);
        if (!row.lastActivity || actDate > row.lastActivity) {
          row.lastActivity = actDate;
        }
      }
    }

    // Recalculate answer rate for aggregated rows
    for (const row of map.values()) {
      row.answerRate = row.dials > 0 ? (row.answered / row.dials) * 100 : 0;
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.lastActivity && b.lastActivity) return b.lastActivity.getTime() - a.lastActivity.getTime();
      if (a.lastActivity) return -1;
      if (b.lastActivity) return 1;
      return b.dials - a.dials;
    });
  }, [snapshots, activities]);

  // Drill-down handler
  const handleDrillDown = async (sdrName: string, metric: "dials" | "answered") => {
    setDrillDown({ sdrName, metric });
    setLoadingDrillDown(true);
    try {
      let query = supabase
        .from("activity_log")
        .select("id, sdr_name, activity_date, contact_name, company_name, call_outcome, call_duration, activity_type")
        .eq("sdr_name", sdrName)
        .gte("activity_date", todayMelbourne + "T00:00:00")
        .lte("activity_date", todayMelbourne + "T23:59:59")
        .order("activity_date", { ascending: false });

      if (metric === "answered") {
        query = query.eq("call_outcome", "Connected");
      }

      const { data } = await query;
      setDrillDownActivities(data || []);
    } catch (err) {
      console.error("Error fetching drill-down:", err);
    } finally {
      setLoadingDrillDown(false);
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Today's Activity</h1>
          <p className="text-muted-foreground">{todayFormatted}</p>
        </div>
        <Badge variant="outline" className="w-fit gap-2 border-green-500/50 text-green-500 px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Live
        </Badge>
      </div>

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
              <p className="text-lg font-medium">No activity yet today</p>
              <p className="text-sm">Activity will appear when calls start.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>SDR Name</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-center">Dials</TableHead>
                    <TableHead className="text-center">Answered</TableHead>
                    <TableHead className="text-center">Answer Rate</TableHead>
                    <TableHead className="text-center">DMs</TableHead>
                    <TableHead className="text-center">SQLs</TableHead>
                    <TableHead className="text-right">Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sdrRows.map((row) => {
                    const recent = isRecentActivity(row.lastActivity);
                    return (
                      <TableRow
                        key={row.sdrName}
                        className={`border-border/50 transition-all ${recent ? "bg-green-500/5 shadow-[inset_0_0_20px_rgba(34,197,94,0.05)]" : ""}`}
                      >
                        <TableCell className="font-medium text-foreground">{row.sdrName}</TableCell>
                        <TableCell className="text-muted-foreground">{row.clientId}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="font-semibold text-foreground hover:text-secondary"
                            onClick={() => handleDrillDown(row.sdrName, "dials")}
                          >
                            {row.dials}
                          </Button>
                        </TableCell>
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
                          <span className="font-bold text-secondary">{row.sqls}</span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {row.lastActivity ? (
                            <span className={recent ? "text-green-500 font-medium" : ""}>
                              {formatDistanceToNow(row.lastActivity, { addSuffix: true })}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
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
              {drillDown?.sdrName} — {drillDown?.metric === "answered" ? "Connected Calls" : "All Calls"} Today
            </DialogTitle>
          </DialogHeader>
          {loadingDrillDown ? (
            <div className="space-y-3 py-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : drillDownActivities.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No calls found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Time</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drillDownActivities.map((a) => (
                    <TableRow key={a.id} className="border-border/50">
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(a.activity_date), "h:mm a")}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {a.contact_name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.company_name || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {a.call_outcome || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {a.call_duration ? `${Math.floor(a.call_duration / 60)}:${String(a.call_duration % 60).padStart(2, "0")}` : "—"}
                      </TableCell>
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

export default TodayActivity;
