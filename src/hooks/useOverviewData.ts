import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { DailySnapshot, SQLMeeting } from "@/lib/supabase-types";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import type { DateRange } from "react-day-picker";
import { ACTIVE_SQL_MEETING_STATUSES } from "@/lib/sqlMeetings";

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

export interface DmRecord {
  client_id: string;
  activity_date: string;
}

export interface SqlRecord {
  client_id: string;
  booking_date: string;
}

interface ActivityRecord {
  client_id: string | null;
  activity_date: string;
  call_outcome: string | null;
}

interface OverviewData {
  snapshots: DailySnapshot[];
  meetings: SQLMeeting[];
  kpis: OverviewKPIs;
  dmsByClient: Record<string, number>;
  dmsByDate: Record<string, number>;
  allSnapshots: DailySnapshot[];
  allActivityData: ActivityRecord[];
  allDmsByClient: Record<string, number>;
  sqlCountsByClient: Record<string, number>;
  allDmData: DmRecord[];
  allSqlData: SqlRecord[];
  clients: ClientInfo[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Aggregate activity_log rows into DailySnapshot-like objects for downstream components */
function aggregateToSnapshots(records: ActivityRecord[]): DailySnapshot[] {
  const grouped: Record<string, Record<string, { dials: number; answered: number }>> = {};
  for (const r of records) {
    const date = r.activity_date.split("T")[0];
    const clientId = r.client_id || "unknown";
    const key = `${date}|${clientId}`;
    if (!grouped[key]) grouped[key] = { [clientId]: { dials: 0, answered: 0 } };
    if (!grouped[key][clientId]) grouped[key][clientId] = { dials: 0, answered: 0 };
    grouped[key][clientId].dials++;
    if (r.call_outcome === "connected") grouped[key][clientId].answered++;
  }

  const snapshots: DailySnapshot[] = [];
  for (const key of Object.keys(grouped)) {
    const [date, clientId] = key.split("|");
    const stats = grouped[key][clientId];
    snapshots.push({
      id: key,
      client_id: clientId,
      sdr_name: "",
      snapshot_date: date,
      dials: stats.dials,
      answered: stats.answered,
      answer_rate: stats.dials > 0 ? (stats.answered / stats.dials) * 100 : 0,
      voicemails: 0,
      no_answers: 0,
      dms_reached: 0,
      mqls: 0,
      sqls: 0,
      created_at: "",
      updated_at: "",
    });
  }
  return snapshots;
}

export const useOverviewData = (dateRange: DateRange | undefined, filterType?: string): OverviewData => {
  const [activityData, setActivityData] = useState<ActivityRecord[]>([]);
  const [allActivityData, setAllActivityData] = useState<ActivityRecord[]>([]);
  const [meetings, setMeetings] = useState<SQLMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState(0);
  const [sqlCount, setSqlCount] = useState(0);
  const [prevDials, setPrevDials] = useState(0);
  const [prevAnswered, setPrevAnswered] = useState(0);
  const [prevConversations, setPrevConversations] = useState(0);
  const [prevSQLs, setPrevSQLs] = useState(0);
  const [hasPrevData, setHasPrevData] = useState(false);
  const [dmsByClient, setDmsByClient] = useState<Record<string, number>>({});
  const [dmsByDate, setDmsByDate] = useState<Record<string, number>>({});
  const [allDmsByClient, setAllDmsByClient] = useState<Record<string, number>>({});
  const [sqlCountsByClient, setSqlCountsByClient] = useState<Record<string, number>>({});
  const [allDmData, setAllDmData] = useState<DmRecord[]>([]);
  const [allSqlData, setAllSqlData] = useState<SqlRecord[]>([]);
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

      // Fetch activity_log for current date range
      let activityQuery = supabase
        .from("activity_log")
        .select("client_id, activity_date, call_outcome");

      if (startDate) activityQuery = activityQuery.gte("activity_date", startDate + "T00:00:00");
      if (endDate) activityQuery = activityQuery.lte("activity_date", endDate + "T23:59:59");

      const { data: activityResult, error: activityError } = await activityQuery;
      if (activityError) throw activityError;

      // Fetch SQL meetings for date range
      let meetingQuery = supabase
        .from("sql_meetings")
        .select("*")
        .in("meeting_status", [...ACTIVE_SQL_MEETING_STATUSES])
        .order("booking_date", { ascending: false });

      if (startDate) meetingQuery = meetingQuery.gte("booking_date", startDate);
      if (endDate) meetingQuery = meetingQuery.lte("booking_date", endDate);

      const { data: meetingData, error: meetingError } = await meetingQuery;
      if (meetingError) throw meetingError;

      // Count SQLs from sql_meetings table
      let sqlCountQuery = supabase
        .from("sql_meetings")
        .select("id", { count: "exact" })
        .in("meeting_status", [...ACTIVE_SQL_MEETING_STATUSES]);

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

      // Fetch ALL activity_log, DMs, clients, and SQL counts (unfiltered) for Client Performance table
      const [allActivityRes, allDmRes, clientsRes, allSqlCountsRes] = await Promise.all([
        supabase.from("activity_log").select("client_id, activity_date, call_outcome"),
        supabase.from("activity_log").select("client_id, activity_date").eq("is_decision_maker", true),
        supabase
          .from("clients")
          .select("client_id, client_name, campaign_start, campaign_end, target_sqls, logo_url, status")
          .eq("status", "active")
          .neq("client_id", "admin")
          .order("client_name", { ascending: true }),
        supabase.from("sql_meetings").select("client_id, booking_date, meeting_status").neq("client_id", null).in("meeting_status", [...ACTIVE_SQL_MEETING_STATUSES]),
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
      let prevDialsCount = 0;
      let prevAnsweredCount = 0;
      let prevConversationsCount = 0;
      let prevSQLsCount = 0;
      let hasAnyPrevData = false;

      if (prevDates) {
        const [prevActivityRes, prevConvRes, prevSqlRes] = await Promise.all([
          supabase
            .from("activity_log")
            .select("call_outcome")
            .gte("activity_date", prevDates.from + "T00:00:00")
            .lte("activity_date", prevDates.to + "T23:59:59"),
          supabase
            .from("activity_log")
            .select("id", { count: "exact" })
            .eq("is_decision_maker", true)
            .gte("activity_date", prevDates.from + "T00:00:00")
            .lte("activity_date", prevDates.to + "T23:59:59"),
          supabase
            .from("sql_meetings")
            .select("id", { count: "exact" })
            .in("meeting_status", [...ACTIVE_SQL_MEETING_STATUSES])
            .gte("booking_date", prevDates.from)
            .lte("booking_date", prevDates.to),
        ]);
        const prevActivity = prevActivityRes.data || [];
        prevDialsCount = prevActivity.length;
        prevAnsweredCount = prevActivity.filter(r => r.call_outcome === "connected").length;
        prevConversationsCount = prevConvRes.count || 0;
        prevSQLsCount = prevSqlRes.count || 0;
        hasAnyPrevData = prevDialsCount > 0 || prevConversationsCount > 0 || prevSQLsCount > 0;
      }

      setActivityData((activityResult || []) as ActivityRecord[]);
      setAllActivityData((allActivityRes.data || []) as ActivityRecord[]);
      setMeetings(meetingData || []);
      setConversations(conversationsCount || 0);
      setSqlCount(sqlsCount || 0);
      setPrevDials(prevDialsCount);
      setPrevAnswered(prevAnsweredCount);
      setPrevConversations(prevConversationsCount);
      setPrevSQLs(prevSQLsCount);
      setHasPrevData(hasAnyPrevData);
      setDmsByClient(dmMap);
      setDmsByDate(dmDateMap);
      setAllDmsByClient(allDmsMap);

      const rawDmData: DmRecord[] = (allDmRes.data || [])
        .filter((r: any) => r.client_id && r.activity_date)
        .map((r: any) => ({ client_id: r.client_id, activity_date: r.activity_date.split("T")[0] }));
      setAllDmData(rawDmData);

      const sqlClientMap: Record<string, number> = {};
      const rawSqlData: SqlRecord[] = [];
      if (allSqlCountsRes.data) {
        for (const row of allSqlCountsRes.data) {
          if (row.client_id) {
            sqlClientMap[row.client_id] = (sqlClientMap[row.client_id] || 0) + 1;
            rawSqlData.push({ client_id: row.client_id, booking_date: row.booking_date });
          }
        }
      }
      setSqlCountsByClient(sqlClientMap);
      setAllSqlData(rawSqlData);

      setClients((clientsRes.data || []) as ClientInfo[]);

      if (import.meta.env.DEV) console.log("📊 Dashboard data fetched:", {
        activity: activityResult?.length || 0,
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

  // Debounce activity_log realtime changes (30s) to avoid excessive refetches during peak call volume
  const activityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedActivityRefetch = useCallback(() => {
    if (activityDebounceRef.current) clearTimeout(activityDebounceRef.current);
    activityDebounceRef.current = setTimeout(() => {
      fetchDashboardData();
    }, 30_000);
  }, [fetchDashboardData]);

  useEffect(() => {
    return () => {
      if (activityDebounceRef.current) clearTimeout(activityDebounceRef.current);
    };
  }, []);

  useRealtimeSubscription({
    table: 'activity_log',
    onChange: debouncedActivityRefetch,
  });

  useRealtimeSubscription({
    table: 'sql_meetings',
    onChange: fetchDashboardData,
  });

  // Derive DailySnapshot-like objects from activity_log for downstream components (charts, tables)
  const snapshots = useMemo(() => aggregateToSnapshots(activityData), [activityData]);
  const allSnapshots = useMemo(() => aggregateToSnapshots(allActivityData), [allActivityData]);

  const kpis = useMemo<OverviewKPIs>(() => {
    const totalDials = activityData.length;
    const totalAnswered = activityData.filter(r => r.call_outcome === "connected").length;
    const totalDMs = conversations; // DM conversations from is_decision_maker count
    const totalSQLs = sqlCount;

    const prevAnswerRate = prevDials > 0 ? (prevAnswered / prevDials) * 100 : 0;

    return {
      totalDials,
      totalAnswered,
      answerRate: totalDials > 0 ? ((totalAnswered / totalDials) * 100).toFixed(1) : "0",
      totalConversations: conversations,
      totalDMs,
      totalSQLs,
      sqlConversionRate: totalDMs > 0 ? ((totalSQLs / totalDMs) * 100).toFixed(1) : "0",
      previousPeriod: hasPrevData ? {
        totalDials: prevDials,
        totalAnswered: prevAnswered,
        answerRate: prevAnswerRate,
        totalConversations: prevConversations,
        totalSQLs: prevSQLs,
      } : null,
    };
  }, [activityData, conversations, sqlCount, prevDials, prevAnswered, hasPrevData, prevConversations, prevSQLs]);

  return { snapshots, meetings, kpis, dmsByClient, dmsByDate, allSnapshots, allActivityData, allDmsByClient, sqlCountsByClient, allDmData, allSqlData, clients, loading, error, refetch: fetchDashboardData };
};
