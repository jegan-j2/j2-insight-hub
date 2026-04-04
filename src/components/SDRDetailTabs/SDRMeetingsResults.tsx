import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Calendar, TrendingUp } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { differenceInDays } from "date-fns";
import { SQLBookedMeetingsTable } from "@/components/SQLBookedMeetingsTable";
import type { SQLMeeting, Client } from "@/lib/supabase-types";

interface SDRMeetingsResultsProps {
  sdrName: string;
}

export const SDRMeetingsResults = ({ sdrName }: SDRMeetingsResultsProps) => {
  const [meetings, setMeetings] = useState<SQLMeeting[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: mtgs }, { data: cls }] = await Promise.all([
      supabase
        .from("sql_meetings")
        .select("*")
        .eq("sdr_name", sdrName)
        .order("booking_date", { ascending: false }),
      supabase.from("clients").select("*"),
    ]);

    if (mtgs) setMeetings(mtgs as unknown as SQLMeeting[]);
    if (cls) setClients(cls as unknown as Client[]);
    setLoading(false);
  }, [sdrName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Subscribe to realtime changes for this SDR
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

  // KPIs — exclude cancelled
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

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm text-muted-foreground">Meeting Show-up Rate</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{kpis.showUpRate}%</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
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

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <p className="text-sm text-muted-foreground">Avg Days to Meeting</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{kpis.avgDays}</p>
          </CardContent>
        </Card>
      </div>

      {/* SQL Meetings Table — exact mirror of Campaign Overview table */}
      <SQLBookedMeetingsTable
        meetings={meetings}
        clients={clients}
        isLoading={loading}
      />
    </>
  );
};
