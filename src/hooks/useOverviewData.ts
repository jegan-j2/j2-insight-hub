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

interface ClientInfo {
  client_id: string;
  client_name: string;
  campaign_start?: string | null;
  campaign_end?: string | null;
  target_sqls?: number | null;
  logo_url?: string | null;
  status?: string | null;
}

interface OverviewData {
  snapshots: DailySnapshot[];
  meetings: SQLMeeting[];
  kpis: OverviewKPIs;
  dmsByClient: Record<string, number>;
  dmsByDate: Record<string, number>;
  allSnapshots: DailySnapshot[];
  allDmsByClient: Record<string, number>;
  sqlCountsByClient: Record<string, number>;
  clients: ClientInfo[];
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
  const [sqlCount, setSqlCount] = useState(0);
  const [prevSnapshotsData, setPrevSnapshotsData] = useState<{dials:number,answered:number}[]>([]);
  const [prevConversations, setPrevConversations] = useState(0);
  const [prevSQLs, setPrevSQLs] = useState(0);
  const [dmsByClient, setDmsByClient] = useState<Record<string, number>>({});
  const [dmsByDate, setDmsByDate] = useState<Record<string, number>>({});
  const [allSnapshots, setAllSnapshots] = useState<DailySnapshot[]>([]);
  const [allDmsByClient, setAllDmsByClient] = useState<Record<string, number>>({});
  const [sqlCountsByClient, setSqlCountsByClient] = useState<Record<string, number>>({});
  const [clients, setClients] = useState<ClientInfo[]>([]);

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

      // Count SQLs from sql_meetings table
      let sqlCountQuery = supabase
        .from("sql_meetings")
        .select("id", { count: "exact" });

      if (startDate) sqlCountQuery = sqlCountQuery.gte("booking_date", startDate);
      if (endDate) sqlCountQuery = sqlCountQuery.lte("booking_date", endDate);

      const { count: sqlsCount } = await sqlCountQuery;

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
        .select("client_id, activity_date")
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

      const dmDateMap: Record<string, number> = {};
      if (dmData) {
        for (const row of dmData) {
          if (row.activity_date) {
            const date = row.activity_date.split("T")[0];
            dmDateMap[date] = (dmDateMap[date] || 0) + 1;
          }
        }
      }

      // Fetch ALL snapshots, DMs, and clients (unfiltered) for Client Performance table
      const [allSnapshotRes, allDmRes, clientsRes, allSqlCountsRes] = await Promise.all([
        supabase.from("daily_snapshots").select("*"),
        supabase.from("activity_log").select("client_id").eq("is_decision_maker", true),
        supabase
          .from("clients")
          .select("client_id, client_name, campaign_start, campaign_end, target_sqls, logo_url, status")
          .eq("status", "active")
          .neq("client_id", "admin")
          .order("client_name", { ascending: true }),
        supabase.from("sql_meetings").select("client_id").neq("client_id", null),
      ]);

      const allDmsMap: Record<string, number> = {};
      if (allDmRes.data) {
        for (const row of allDmRes.data) {
          if (row.client_id) {
            allDmsMap[row.client_id] = (allDmsMap[row.client_id] || 0) + 1;
          }
        }
      }

      // Fetch previous period data
      const prevDates = getPreviousPeriodDates();
      let prevSnapshots: {dials:number,answered:number}[] = [];
      let prevConversationsCount = 0;
      let prevSQLsCount = 0;

      if (prevDates) {
        const [prevSnapshotRes, prevConvRes, prevSqlRes] = await Promise.all([
          supabase
            .from("daily_snapshots")
            .select("dials, answered")
            .gte("snapshot_date", prevDates.from)
            .lte("snapshot_date", prevDates.to),
          supabase
            .from("activity_log")
            .select("id", { count: "exact" })
            .eq("is_decision_maker", true)
            .gte("activity_date", prevDates.from + "T00:00:00")
            .lte("activity_date", prevDates.to + "T23:59:59"),
          supabase
            .from("sql_meetings")
            .select("id", { count: "exact" })
            .gte("booking_date", prevDates.from)
            .lte("booking_date", prevDates.to),
        ]);
        prevSnapshots = prevSnapshotRes.data || [];
        prevConversationsCount = prevConvRes.count || 0;
        prevSQLsCount = prevSqlRes.count || 0;
      }

      setSnapshots(snapshotData || []);
      setMeetings(meetingData || []);
      setConversations(conversationsCount || 0);
      setSqlCount(sqlsCount || 0);
      setPrevSnapshotsData(prevSnapshots);
      setPrevConversations(prevConversationsCount);
      setPrevSQLs(prevSQLsCount);
      setDmsByClient(dmMap);
      setDmsByDate(dmDateMap);
      setAllSnapshots((allSnapshotRes.data || []) as unknown as DailySnapshot[]);
      setAllDmsByClient(allDmsMap);

      const sqlClientMap: Record<string, number> = {};
      if (allSqlCountsRes.data) {
        for (const row of allSqlCountsRes.data) {
          if (row.client_id) {
            sqlClientMap[row.client_id] = (sqlClientMap[row.client_id] || 0) + 1;
          }
        }
      }
      setSqlCountsByClient(sqlClientMap);

      setClients((clientsRes.data || []) as ClientInfo[]);

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
    let cancelled = false;
    const run = async () => {
      try {
        await fetchDashboardData();
      } catch {
        if (!cancelled) {
          await new Promise(r => setTimeout(r, 2000));
          if (!cancelled) fetchDashboardData();
        }
      }
    };
    run();
    return () => { cancelled = true; };
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
    const totalSQLs = sqlCount;

    const prevDials = prevSnapshotsData.reduce((sum, s) => sum + (s.dials || 0), 0);
    const prevAnswered = prevSnapshotsData.reduce((sum, s) => sum + (s.answered || 0), 0);
    const prevAnswerRate = prevDials > 0 ? (prevAnswered / prevDials) * 100 : 0;

    return {
      totalDials,
      totalAnswered,
      answerRate: totalDials > 0 ? ((totalAnswered / totalDials) * 100).toFixed(1) : "0",
      totalConversations: conversations,
      totalDMs,
      totalSQLs,
      sqlConversionRate: totalDMs > 0 ? ((totalSQLs / totalDMs) * 100).toFixed(1) : "0",
      previousPeriod: prevSnapshotsData.length > 0 || prevConversations > 0 || prevSQLs > 0 ? {
        totalDials: prevDials,
        totalAnswered: prevAnswered,
        answerRate: prevAnswerRate,
        totalConversations: prevConversations,
        totalSQLs: prevSQLs,
      } : null,
    };
  }, [snapshots, conversations, sqlCount, prevSnapshotsData, prevConversations, prevSQLs]);

  return { snapshots, meetings, kpis, dmsByClient, dmsByDate, allSnapshots, allDmsByClient, sqlCountsByClient, clients, loading, error, refetch: fetchDashboardData };
};
