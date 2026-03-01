import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Client, SQLMeeting } from "@/lib/supabase-types";
import { format } from "date-fns";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import type { DateRange } from "react-day-picker";

interface ActivityRecord {
  id: string;
  activity_date: string;
  contact_name: string | null;
  company_name: string | null;
  call_duration: number | null;
  call_outcome: string | null;
  is_decision_maker: boolean | null;
}

interface ClientViewKPIs {
  totalDials: number;
  totalAnswered: number;
  answerRate: string;
  totalDMs: number;
}

interface CampaignData {
  targetSQLs: number;
  achievedSQLs: number;
  remaining: number;
  sqlPercentage: number;
  campaignStart: string | null;
  campaignEnd: string | null;
  totalWorkingDays: number;
  elapsedWorkingDays: number;
  daysRemaining: number;
  timePercentage: number;
}

export interface ClientViewData {
  loading: boolean;
  error: string | null;
  client: Client | null;
  kpis: ClientViewKPIs;
  campaign: CampaignData | null;
  meetings: SQLMeeting[];
  answeredCalls: ActivityRecord[];
  dmConversations: ActivityRecord[];
  refetch: () => void;
}

const countWorkingDays = (start: Date, end: Date): number => {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
};

export const useClientViewData = (clientId: string, dateRange: DateRange | undefined): ClientViewData => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [meetings, setMeetings] = useState<SQLMeeting[]>([]);
  const [totalDials, setTotalDials] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [totalDMs, setTotalDMs] = useState(0);
  const [answeredCalls, setAnsweredCalls] = useState<ActivityRecord[]>([]);
  const [dmConversations, setDmConversations] = useState<ActivityRecord[]>([]);
  const [campaignSQLs, setCampaignSQLs] = useState(0);

  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      setError(null);

      // Fetch client
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (clientError) throw clientError;
      setClient(clientData as unknown as Client);

      // Build date filters
      const dateStart = startDate ? startDate + "T00:00:00" : undefined;
      const dateEnd = endDate ? endDate + "T23:59:59" : undefined;

      // Total dials (all activity_log entries for this client in date range)
      let dialsQuery = supabase
        .from("activity_log")
        .select("id", { count: "exact" })
        .eq("client_id", clientId);
      if (dateStart) dialsQuery = dialsQuery.gte("activity_date", dateStart);
      if (dateEnd) dialsQuery = dialsQuery.lte("activity_date", dateEnd);
      const { count: dialsCount } = await dialsQuery;

      // Total answered (call_outcome = 'connected')
      let answeredQuery = supabase
        .from("activity_log")
        .select("id, activity_date, contact_name, company_name, call_duration, call_outcome, is_decision_maker")
        .eq("client_id", clientId)
        .eq("call_outcome", "connected");
      if (dateStart) answeredQuery = answeredQuery.gte("activity_date", dateStart);
      if (dateEnd) answeredQuery = answeredQuery.lte("activity_date", dateEnd);
      const { data: answeredData } = await answeredQuery;

      // DM Conversations (is_decision_maker = true AND call_outcome = 'connected')
      let dmQuery = supabase
        .from("activity_log")
        .select("id, activity_date, contact_name, company_name, call_duration, call_outcome, is_decision_maker")
        .eq("client_id", clientId)
        .eq("is_decision_maker", true)
        .eq("call_outcome", "connected");
      if (dateStart) dmQuery = dmQuery.gte("activity_date", dateStart);
      if (dateEnd) dmQuery = dmQuery.lte("activity_date", dateEnd);
      const { data: dmData } = await dmQuery;

      // SQL meetings for table (filtered by date)
      let meetingQuery = supabase
        .from("sql_meetings")
        .select("*")
        .eq("client_id", clientId)
        .order("booking_date", { ascending: false });
      if (startDate) meetingQuery = meetingQuery.gte("booking_date", startDate);
      if (endDate) meetingQuery = meetingQuery.lte("booking_date", endDate);
      const { data: meetingData, error: meetingError } = await meetingQuery;
      if (meetingError) throw meetingError;

      // Campaign SQLs (full campaign period, not filtered by date)
      let campaignSqlQuery = supabase
        .from("sql_meetings")
        .select("id", { count: "exact" })
        .eq("client_id", clientId);
      if (clientData?.campaign_start) campaignSqlQuery = campaignSqlQuery.gte("booking_date", clientData.campaign_start);
      if (clientData?.campaign_end) campaignSqlQuery = campaignSqlQuery.lte("booking_date", clientData.campaign_end);
      const { count: campaignSqlCount } = await campaignSqlQuery;

      setTotalDials(dialsCount || 0);
      setTotalAnswered(answeredData?.length || 0);
      setTotalDMs(dmData?.length || 0);
      setAnsweredCalls(answeredData || []);
      setDmConversations(dmData || []);
      setMeetings((meetingData || []) as unknown as SQLMeeting[]);
      setCampaignSQLs(campaignSqlCount || 0);
    } catch (err: any) {
      console.error("Error fetching client view data:", err);
      setError(err?.message || "Failed to load client data");
    } finally {
      setLoading(false);
    }
  }, [clientId, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeSubscription({
    table: "activity_log",
    filter: `client_id=eq.${clientId}`,
    onChange: fetchData,
  });

  useRealtimeSubscription({
    table: "sql_meetings",
    filter: `client_id=eq.${clientId}`,
    onChange: fetchData,
  });

  const kpis = useMemo<ClientViewKPIs>(() => ({
    totalDials,
    totalAnswered,
    answerRate: totalDials > 0 ? ((totalAnswered / totalDials) * 100).toFixed(1) : "0",
    totalDMs,
  }), [totalDials, totalAnswered, totalDMs]);

  const campaign = useMemo<CampaignData | null>(() => {
    if (!client?.target_sqls || !client?.campaign_start || !client?.campaign_end) return null;

    const start = new Date(client.campaign_start);
    const end = new Date(client.campaign_end);
    const today = new Date();

    const totalWorkingDays = countWorkingDays(start, end);
    const effectiveToday = today > end ? end : today < start ? start : today;
    const elapsedWorkingDays = countWorkingDays(start, effectiveToday);
    const remainingWorkingDays = Math.max(0, totalWorkingDays - elapsedWorkingDays);

    const achieved = campaignSQLs;
    const target = client.target_sqls;
    const remaining = Math.max(0, target - achieved);
    const sqlPercentage = target > 0 ? (achieved / target) * 100 : 0;
    const timePercentage = totalWorkingDays > 0 ? (elapsedWorkingDays / totalWorkingDays) * 100 : 0;

    return {
      targetSQLs: target,
      achievedSQLs: achieved,
      remaining,
      sqlPercentage,
      campaignStart: client.campaign_start,
      campaignEnd: client.campaign_end,
      totalWorkingDays,
      elapsedWorkingDays,
      daysRemaining: remainingWorkingDays,
      timePercentage,
    };
  }, [client, campaignSQLs]);

  return {
    loading,
    error,
    client,
    kpis,
    campaign,
    meetings,
    answeredCalls,
    dmConversations,
    refetch: fetchData,
  };
};
