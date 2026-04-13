import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { SQLMeeting } from "@/lib/supabase-types";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import type { DateRange } from "react-day-picker";
import { ACTIVE_SQL_MEETING_STATUSES } from "@/lib/sqlMeetings";
import { melbourneStartOfDay, melbourneEndOfDay, melbourneStartOfDayUTC, melbourneEndOfDayUTC } from "@/lib/melbourneTime";

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

export interface DailyActivityRow {
  activity_day: string;
  dials: number;
  answered: number;
  dm_conversations: number;
}

interface OverviewData {
  dailyActivity: DailyActivityRow[];
  meetings: SQLMeeting[];
  kpis: OverviewKPIs;
  dmsByClient: Record<string, number>;
  dmsByDate: Record<string, number>;
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

export const useOverviewData = (dateRange: DateRange | undefined, filterType?: string): OverviewData => {
  const [dailyActivity, setDailyActivity] = useState<DailyActivityRow[]>([]);
  const [allActivityData, setAllActivityData] = useState<ActivityRecord[]>([]);
  const [meetings, setMeetings] = useState<SQLMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDials, setCurrentDials] = useState(0);
  const [currentAnswered, setCurrentAnswered] = useState(0);
  const [currentDMs, setCurrentDMs] = useState(0);
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

      // Fetch current period KPIs via RPC
      const kpiParams: { p_start_date: string; p_end_date: string } = {
        p_start_date: melbourneStartOfDay(startDate || "2000-01-01"),
        p_end_date: melbourneEndOfDay(endDate || "2099-12-31"),
      };
      const { data: kpiData, error: kpiError } = await supabase.rpc('get_overview_kpis', kpiParams);
      if (kpiError) throw kpiError;

      const kpiRow = kpiData?.[0] || { total_dials: 0, total_answered: 0, answer_rate: 0, dm_conversations: 0 };

      // Fetch daily activity data for chart via RPC
      const { data: dailyData, error: dailyError } = await supabase.rpc('get_daily_activity', {
        p_start_date: melbourneStartOfDay(startDate || "2000-01-01"),
        p_end_date: melbourneEndOfDay(endDate || "2099-12-31"),
      });
      if (dailyError) throw dailyError;

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

      // Fetch DM Conversations grouped by client_id
      let dmQuery = supabase
        .from("activity_log")
        .select("client_id, activity_date")
        .eq("is_decision_maker", true);
      if (startDate) dmQuery = dmQuery.gte("activity_date", melbourneStartOfDayUTC(startDate));
      if (endDate) dmQuery = dmQuery.lte("activity_date", melbourneEndOfDayUTC(endDate));
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
            .gte("activity_date", melbourneStartOfDayUTC(prevDates.from))
            .lte("activity_date", melbourneEndOfDayUTC(prevDates.to)),
          supabase
            .from("activity_log")
            .select("id", { count: "exact" })
            .eq("is_decision_maker", true)
            .gte("activity_date", melbourneStartOfDayUTC(prevDates.from))
            .lte("activity_date", melbourneEndOfDayUTC(prevDates.to)),
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

      setDailyActivity((dailyData || []) as DailyActivityRow[]);
      setAllActivityData((allActivityRes.data || []) as ActivityRecord[]);
      setMeetings(meetingData || []);
      setCurrentDials(kpiRow.total_dials || 0);
      setCurrentAnswered(kpiRow.total_answered || 0);
      setCurrentDMs(kpiRow.dm_conversations || 0);
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
        dials: kpiRow.total_dials,
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


  const kpis = useMemo<OverviewKPIs>(() => {
    const totalDials = currentDials;
    const totalAnswered = currentAnswered;
    const totalDMs = currentDMs;
    const totalSQLs = sqlCount;

    const prevAnswerRate = prevDials > 0 ? (prevAnswered / prevDials) * 100 : 0;

    return {
      totalDials,
      totalAnswered,
      answerRate: totalDials > 0 ? ((totalAnswered / totalDials) * 100).toFixed(1) : "0",
      totalConversations: currentDMs,
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
  }, [currentDials, currentAnswered, currentDMs, sqlCount, prevDials, prevAnswered, hasPrevData, prevConversations, prevSQLs]);

  return { dailyActivity, meetings, kpis, dmsByClient, dmsByDate, allActivityData, allDmsByClient, sqlCountsByClient, allDmData, allSqlData, clients, loading, error, refetch: fetchDashboardData };
};
