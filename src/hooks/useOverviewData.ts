import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { DailySnapshot, SQLMeeting } from "@/lib/supabase-types";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import type { DateRange } from "react-day-picker";

interface OverviewKPIs {
  totalDials: number;
  totalAnswered: number;
  answerRate: string;
  totalConversations: number;
  totalDMs: number;
  totalSQLs: number;
  sqlConversionRate: string;
  previousPeriod: {
    totalDials: number;
    totalAnswered: number;
    answerRate: number;
    totalConversations: number;
    totalSQLs: number;
  } | null;
}

interface OverviewData {
  snapshots: DailySnapshot[];
  meetings: SQLMeeting[];
  kpis: OverviewKPIs;
  dmsByClient: Record<string, number>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useOverviewData = (dateRange: DateRange | undefined, filterType?: string): OverviewData => {
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [meetings, setMeetings] = useState<SQLMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState(0);
  const [prevSnapshotsData, setPrevSnapshotsData] = useState<{dials:number,answered:number,sqls:number}[]>([]);
  const [prevConversations, setPrevConversations] = useState(0);
  const [dmsByClient, setDmsByClient] = useState<Record<string, number>>({});

  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

  const getPreviousPeriodDates = () => {
    if (!dateRange?.from || !dateRange?.to) return null;
    const from = dateRange.from;
    const to = dateRange.to;

    if (filterType === "last7days") {
      return {
        from: format(subDays(from, 7), "yyyy-MM-dd"),
        to: format(subDays(to, 7), "yyyy-MM-dd"),
      };
    } else if (filterType === "last30days") {
      return {
        from: format(subDays(from, 30), "yyyy-MM-dd"),
        to: format(subDays(to, 30), "yyyy-MM-dd"),
      };
    } else if (filterType === "thisMonth") {
      const prevMonth = subMonths(from, 1);
      return {
        from: format(startOfMonth(prevMonth), "yyyy-MM-dd"),
        to: format(endOfMonth(prevMonth), "yyyy-MM-dd"),
      };
    } else if (filterType === "lastMonth") {
      const twoMonthsAgo = subMonths(from, 1);
      return {
        from: format(startOfMonth(twoMonthsAgo), "yyyy-MM-dd"),
        to: format(endOfMonth(twoMonthsAgo), "yyyy-MM-dd"),
      };
    }
    return null;
  };

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

      // Fetch conversations (Decision Maker calls) for current period
      let conversationsQuery = supabase
        .from("activity_log")
        .select("id", { count: "exact" })
        .eq("is_decision_maker", true);

      if (startDate) conversationsQuery = conversationsQuery.gte("activity_date", startDate + "T00:00:00");
      if (endDate) conversationsQuery = conversationsQuery.lte("activity_date", endDate + "T23:59:59");

      const { count: conversationsCount } = await conversationsQuery;

      // Fetch DM Conversations grouped by client_id
      let dmQuery = supabase
        .from("activity_log")
        .select("client_id")
        .eq("is_decision_maker", true);
      if (startDate) dmQuery = dmQuery.gte("activity_date", startDate + "T00:00:00");
      if (endDate) dmQuery = dmQuery.lte("activity_date", endDate + "T23:59:59");
      const { data: dmData } = await dmQuery;

      const dmMap: Record<string, number> = {};
      if (dmData) {
        for (const row of dmData) {
          if (row.client_id) {
            dmMap[row.client_id] = (dmMap[row.client_id] || 0) + 1;
          }
        }
      }

      // Fetch previous period snapshots and conversations
      const prevDates = getPreviousPeriodDates();
      let prevSnapshots: {dials:number,answered:number,sqls:number}[] = [];
      let prevConversationsCount = 0;

      if (prevDates) {
        const [prevSnapshotRes, prevConvRes] = await Promise.all([
          supabase
            .from("daily_snapshots")
            .select("dials, answered, sqls")
            .gte("snapshot_date", prevDates.from)
            .lte("snapshot_date", prevDates.to),
          supabase
            .from("activity_log")
            .select("id", { count: "exact" })
            .eq("is_decision_maker", true)
            .gte("activity_date", prevDates.from + "T00:00:00")
            .lte("activity_date", prevDates.to + "T23:59:59"),
        ]);
        prevSnapshots = prevSnapshotRes.data || [];
        prevConversationsCount = prevConvRes.count || 0;
      }

      setSnapshots(snapshotData || []);
      setMeetings(meetingData || []);
      setConversations(conversationsCount || 0);
      setPrevSnapshotsData(prevSnapshots);
      setPrevConversations(prevConversationsCount);
      setDmsByClient(dmMap);

      if (import.meta.env.DEV) console.log("📊 Dashboard data fetched:", {
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
  }, [startDate, endDate, filterType]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useRealtimeSubscription({
    table: 'daily_snapshots',
    onChange: fetchDashboardData,
  });

  useRealtimeSubscription({
    table: 'sql_meetings',
    onChange: fetchDashboardData,
  });

  const kpis = useMemo<OverviewKPIs>(() => {
    const totalDials = snapshots.reduce((sum, s) => sum + (s.dials || 0), 0);
    const totalAnswered = snapshots.reduce((sum, s) => sum + (s.answered || 0), 0);
    const totalDMs = snapshots.reduce((sum, s) => sum + (s.dms_reached || 0), 0);
    const totalSQLs = snapshots.reduce((sum, s) => sum + (s.sqls || 0), 0);

    const prevDials = prevSnapshotsData.reduce((sum, s) => sum + (s.dials || 0), 0);
    const prevAnswered = prevSnapshotsData.reduce((sum, s) => sum + (s.answered || 0), 0);
    const prevSQLs = prevSnapshotsData.reduce((sum, s) => sum + (s.sqls || 0), 0);
    const prevAnswerRate = prevDials > 0 ? (prevAnswered / prevDials) * 100 : 0;

    return {
      totalDials,
      totalAnswered,
      answerRate: totalDials > 0 ? ((totalAnswered / totalDials) * 100).toFixed(1) : "0",
      totalConversations: conversations,
      totalDMs,
      totalSQLs,
      sqlConversionRate: totalDMs > 0 ? ((totalSQLs / totalDMs) * 100).toFixed(1) : "0",
      previousPeriod: prevSnapshotsData.length > 0 || prevConversations > 0 ? {
        totalDials: prevDials,
        totalAnswered: prevAnswered,
        answerRate: prevAnswerRate,
        totalConversations: prevConversations,
        totalSQLs: prevSQLs,
      } : null,
    };
  }, [snapshots, conversations, prevSnapshotsData, prevConversations]);

  return { snapshots, meetings, kpis, dmsByClient, loading, error, refetch: fetchDashboardData };
};
