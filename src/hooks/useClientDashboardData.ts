import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { DailySnapshot, SQLMeeting, Client } from '@/lib/supabase-types'

export const useClientDashboardData = (clientId: string, startDate: string, endDate: string) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([])
  const [meetings, setMeetings] = useState<SQLMeeting[]>([])

  const fetchData = useCallback(async () => {
    if (!clientId) return
    try {
      setLoading(true)
      setError(null)

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle()

      if (clientError) throw clientError
      setClient(clientData)

      const { data: snapshotData, error: snapshotError } = await supabase
        .from('daily_snapshots')
        .select('*')
        .eq('client_id', clientId)
        .gte('snapshot_date', startDate)
        .lte('snapshot_date', endDate)
        .order('snapshot_date', { ascending: false })

      if (snapshotError) throw snapshotError
      setSnapshots(snapshotData || [])

      const { data: meetingData, error: meetingError } = await supabase
        .from('sql_meetings')
        .select('*')
        .eq('client_id', clientId)
        .gte('booking_date', startDate)
        .lte('booking_date', endDate)
        .order('booking_date', { ascending: false })

      if (meetingError) throw meetingError
      setMeetings(meetingData || [])
    } catch (err) {
      console.error('Error fetching client dashboard data:', err)
      setError('Failed to load client dashboard data')
    } finally {
      setLoading(false)
    }
  }, [clientId, startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const kpis = useMemo(() => {
    const totalDials = snapshots.reduce((sum, s) => sum + s.dials, 0)
    const totalAnswered = snapshots.reduce((sum, s) => sum + s.answered, 0)
    const totalDMs = snapshots.reduce((sum, s) => sum + s.dms_reached, 0)
    const totalMQLs = snapshots.reduce((sum, s) => sum + s.mqls, 0)
    const totalSQLs = snapshots.reduce((sum, s) => sum + s.sqls, 0)

    return {
      totalDials,
      totalAnswered,
      answerRate: totalDials > 0 ? (totalAnswered / totalDials * 100).toFixed(2) : '0',
      totalDMs,
      totalMQLs,
      totalSQLs,
      mqlsOnDmsRate: totalDMs > 0 ? (totalMQLs / totalDMs * 100).toFixed(2) : '0',
      mqlsOnDialsRate: totalDials > 0 ? (totalMQLs / totalDials * 100).toFixed(2) : '0',
      sqlsOnDmsRate: totalDMs > 0 ? (totalSQLs / totalDMs * 100).toFixed(2) : '0',
      sqlsOnDialsRate: totalDials > 0 ? (totalSQLs / totalDials * 100).toFixed(2) : '0',
    }
  }, [snapshots])

  const campaignProgress = useMemo(() => {
    if (!client?.target_sqls) return null
    return {
      target: client.target_sqls,
      achieved: kpis.totalSQLs,
      remaining: Math.max(0, client.target_sqls - kpis.totalSQLs),
      percentage: ((kpis.totalSQLs / client.target_sqls) * 100).toFixed(1),
      campaignStart: client.campaign_start,
      campaignEnd: client.campaign_end,
    }
  }, [client, kpis.totalSQLs])

  const chartData = useMemo(() => {
    return [...snapshots]
      .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
      .map(s => ({
        date: s.snapshot_date,
        dials: s.dials,
        answered: s.answered,
        dms: s.dms_reached,
        sqls: s.sqls,
      }))
  }, [snapshots])

  return {
    loading,
    error,
    client,
    kpis,
    campaignProgress,
    snapshots,
    meetings,
    chartData,
    refetch: fetchData,
  }
}
