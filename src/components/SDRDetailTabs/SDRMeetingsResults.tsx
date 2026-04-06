import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Calendar, TrendingUp, Target } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { differenceInDays, format, isWithinInterval } from "date-fns";
import { SQLBookedMeetingsTable } from "@/components/SQLBookedMeetingsTable";
import type { SQLMeeting, Client } from "@/lib/supabase-types";
import type { DateRange } from "react-day-picker";

interface SDRMeetingsResultsProps {
  sdrName: string;
  dateRange?: DateRange;
  clientId?: string;
}

export const SDRMeetingsResults = ({ sdrName, dateRange, clientId }: SDRMeetingsResultsProps) => {
  const [allMeetings, setAllMeetings] = useState<SQLMeeting[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let mtgQuery = supabase
      .from("sql_meetings")
      .select("*")
      .eq("sdr_name", sdrName)
      .order("booking_date", { ascending: false });
    if (clientId) mtgQuery = mtgQuery.eq("client_id", clientId);

    const [{ data: mtgs }, { data: cls }] = await Promise.all([
      mtgQuery,
      supabase.from("clients").select("*"),
    ]);

    if (mtgs) setAllMeetings(mtgs as unknown as SQLMeeting[]);
    if (cls) setClients(cls as unknown as Client[]);
    setLoading(false);
  }, [sdrName, clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel("sdr-meetings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sql_meetings", filter: `sdr_name=eq.${sdrName}` },
        () => fetchData()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sdrName, fetchData]);

  // Filter meetings by date range based on booking_date
  const meetings = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return allMeetings;
    return allMeetings.filter((m) => {
      const d = new Date(m.booking_date + "T00:00:00");
      return isWithinInterval(d, { start: dateRange.from!, end: dateRange.to! });
    });
  }, [allMeetings, dateRange]);

  const kpis = useMemo(() => {
    const eligible = meetings.filter((m) => m.meeting_status !== "cancelled");
    const heldOrNoShow = eligible.filter((m) => m.meeting_status === "held" || m.meeting_status === "no_show");
    const held = heldOrNoShow.filter((m) => m.meeting_status === "held");
    const showUpRate = heldOrNoShow.length > 0 ? (held.length / heldOrNoShow.length) * 100 : 0;

    let totalDays = 0;
    let dayCount = 0;
    for (const m of eligible) {
      if (m.booking_date && m.meeting_date) {
        const diff = differenceInDays(new Date(m.meeting_date), new Date(m.booking_date));
        if (diff >= 0) {
          totalDays += diff;
          dayCount += 1;
        }
      }
    }
    const avgDays = dayCount > 0 ? (totalDays / dayCount).toFixed(1) : "—";

    return {
      showUpRate: showUpRate.toFixed(0),
      heldCount: held.length,
      totalEligible: eligible.length,
      avgDays,
    };
  }, [meetings]);

  const hasMeetings = meetings.length > 0;

  const allPending = useMemo(() => {
    const eligible = meetings.filter((m) => m.meeting_status !== "cancelled");
    const heldOrNoShow = eligible.filter((m) => m.meeting_status === "held" || m.meeting_status === "no_show");
    return heldOrNoShow.length === 0 && eligible.length > 0;
  }, [meetings]);

  if (loading) {
    return <div className="text-center text-sm text-muted-foreground py-8">Loading…</div>;
  }

  if (!hasMeetings) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Target className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <p className="text-[16px] font-semibold text-[#0F172A] dark:text-foreground mb-1">
          No SQL meetings booked yet
        </p>
        <p className="text-[13px] text-muted-foreground text-center max-w-sm">
          Meetings will appear here when this SDR books their first SQL
        </p>
      </div>
    );
  }

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm rounded-lg bg-white dark:bg-card border border-[#E2E8F0] dark:border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm text-muted-foreground">Meeting Show-up Rate</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{kpis.showUpRate}%</p>
            {allPending && (
              <p className="text-[11px] text-muted-foreground italic mt-1">No meetings marked as held yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg bg-white dark:bg-card border border-[#E2E8F0] dark:border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-muted-foreground">Meetings Held</p>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {kpis.heldCount} <span className="text-lg text-muted-foreground">of {kpis.totalEligible}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg bg-white dark:bg-card border border-[#E2E8F0] dark:border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <p className="text-sm text-muted-foreground">Avg Days to Meeting</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{kpis.avgDays}</p>
          </CardContent>
        </Card>
      </div>

      <SQLBookedMeetingsTable
        meetings={meetings}
        clients={clients}
        isLoading={loading}
        hideSDRFilter
        hideSDRColumn
      />
    </>
  );
};
