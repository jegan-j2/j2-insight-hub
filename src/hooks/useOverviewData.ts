import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { DailySnapshot, SQLMeeting } from "@/lib/supabase-types";
import { format } from "date-fns";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import type { DateRange } from "react-day-picker";

interface OverviewKPIs {
  totalDials: number;
  totalAnswered: number;
  answerRate: string;
  totalDMs: number;
  totalSQLs: number;
  sqlConversionRate: string;
}

interface OverviewData {
  snapshots: DailySnapshot[];
  meetings: SQLMeeting[];
  kpis: OverviewKPIs;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useOverviewData = (dateRange: DateRange | undefined): OverviewData => {
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [meetings, setMeetings] = useState<SQLMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch daily snapshots for date range
      let snapshotQuery = supabase
        .from("daily_snapshots")
        .select("*")
        .order("snapshot_date", { ascending: false });

      if (startDate) snapshotQuery = snapshotQuery.gte("snapshot_date", startDate);
      if (endDate) snapshotQuery = snapshotQuery.lte("snapshot_date", endDate);

      const { data: snapshotData, error: snapshotError } = await snapshotQuery;

      if (snapshotError) throw snapshotError;

      // Fetch SQL meetings for date range
      let meetingQuery = supabase
        .from("sql_meetings")
        .select("*")
        .order("booking_date", { ascending: false });

      if (startDate) meetingQuery = meetingQuery.gte("booking_date", startDate);
      if (endDate) meetingQuery = meetingQuery.lte("booking_date", endDate);

      const { data: meetingData, error: meetingError } = await meetingQuery;

      if (meetingError) throw meetingError;

      setSnapshots(snapshotData || []);
      setMeetings(meetingData || []);

      console.log("📊 Dashboard data fetched:", {
        snapshots: snapshotData?.length || 0,
        meetings: meetingData?.length || 0,
        dateRange: { startDate, endDate },
      });
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError(err?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useRealtimeSubscription({
    table: 'daily_snapshots',
    onChange: fetchDashboardData,
    showNotification: true,
  });

  useRealtimeSubscription({
    table: 'sql_meetings',
    onChange: fetchDashboardData,
    showNotification: true,
  });

  const kpis = useMemo<OverviewKPIs>(() => {
    const totalDials = snapshots.reduce((sum, s) => sum + (s.dials || 0), 0);
    const totalAnswered = snapshots.reduce((sum, s) => sum + (s.answered || 0), 0);
    const totalDMs = snapshots.reduce((sum, s) => sum + (s.dms_reached || 0), 0);
    const totalSQLs = snapshots.reduce((sum, s) => sum + (s.sqls || 0), 0);

    return {
      totalDials,
      totalAnswered,
      answerRate: totalDials > 0 ? ((totalAnswered / totalDials) * 100).toFixed(1) : "0",
      totalDMs,
      totalSQLs,
      sqlConversionRate: totalDMs > 0 ? ((totalSQLs / totalDMs) * 100).toFixed(1) : "0",
    };
  }, [snapshots]);

  return { snapshots, meetings, kpis, loading, error, refetch: fetchDashboardData };
};
