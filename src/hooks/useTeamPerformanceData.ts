import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { useRealtimeSubscription } from './useRealtimeSubscription'

interface LeaderboardEntry {
  rank: number
  name: string
  clientId: string
  initials: string
  totalDials: number
  totalAnswered: number
  totalDMs: number
  totalSQLs: number
  answerRate: string
  conversionRate: string
  trend: number
  avgDuration: number
}

const mapRpcToLeaderboard = (data: any[]): LeaderboardEntry[] => {
  if (!data || data.length === 0) return []
  return data.map((row: any, index: number) => ({
    rank: Number(row.rank) || index + 1,
    name: row.sdr_name,
    clientId: row.client_id || '',
    initials: row.sdr_name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2),
    totalDials: Number(row.total_dials) || 0,
    totalAnswered: Number(row.answered) || 0,
    totalDMs: Number(row.dm_conversations) || 0,
    totalSQLs: Number(row.sqls) || 0,
    answerRate: String(row.answer_rate ?? '0'),
    conversionRate: String(row.conv_rate ?? '0'),
    trend: 0,
    avgDuration: Number(row.avg_talk_time_seconds) || 0,
  }))
}

export const useTeamPerformanceData = (dateRange: DateRange | undefined, clientFilter?: string) => {
  const [loading, setLoading] = useState(true)
  const [rpcData, setRpcData] = useState<any[]>([])
  const [prevRpcData, setPrevRpcData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const startDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''
  const endDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''

  const prevDates = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return { start: '', end: '' }
    const duration = dateRange.to.getTime() - dateRange.from.getTime()
    const prevEnd = new Date(dateRange.from.getTime() - 1)
    const prevStart = new Date(prevEnd.getTime() - duration)
    return { start: format(prevStart, 'yyyy-MM-dd'), end: format(prevEnd, 'yyyy-MM-dd') }
  }, [dateRange])

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return

    try {
      setLoading(true)
      setError(null)

      const clientId = clientFilter && clientFilter !== 'all' ? clientFilter : null

      const [currentResult, prevResult] = await Promise.all([
        supabase.rpc('get_team_leaderboard', {
          p_start_date: startDate + 'T00:00:00+11:00',
          p_end_date: endDate + 'T23:59:59+11:00',
          p_client_id: clientId,
        }),
        prevDates.start && prevDates.end
          ? supabase.rpc('get_team_leaderboard', {
              p_start_date: prevDates.start + 'T00:00:00+11:00',
              p_end_date: prevDates.end + 'T23:59:59+11:00',
              p_client_id: clientId,
            })
          : Promise.resolve({ data: [], error: null }),
      ])

      if (currentResult.error) throw currentResult.error

      setRpcData(currentResult.data || [])
      setPrevRpcData(prevResult.data || [])
    } catch (err) {
      console.error('Error fetching team performance data:', err)
      setError('Failed to load team performance data')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, clientFilter, prevDates.start, prevDates.end])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        await fetchData()
      } catch {
        if (!cancelled) {
          await new Promise(r => setTimeout(r, 2000))
          if (!cancelled) fetchData()
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [fetchData])

  useRealtimeSubscription({
    table: 'activity_log',
    onChange: fetchData,
  })

  const leaderboard: LeaderboardEntry[] = useMemo(() => mapRpcToLeaderboard(rpcData), [rpcData])
  const previousLeaderboard: LeaderboardEntry[] = useMemo(() => mapRpcToLeaderboard(prevRpcData), [prevRpcData])

  // Build chart data with client name appended for SDRs appearing in multiple rows
  const activityChartData = useMemo(() => {
    // Count how many rows each SDR name appears in
    const nameCounts = new Map<string, number>()
    for (const sdr of leaderboard) {
      nameCounts.set(sdr.name, (nameCounts.get(sdr.name) || 0) + 1)
    }
    // Find client names from rpcData
    const clientNameFromRpc = new Map<string, string>()
    for (const row of rpcData) {
      if (row.client_name && row.client_id) {
        clientNameFromRpc.set(row.client_id, row.client_name)
      }
    }
    return leaderboard.map(sdr => {
      const isDuplicate = (nameCounts.get(sdr.name) || 0) > 1
      const clientLabel = isDuplicate && sdr.clientId
        ? clientNameFromRpc.get(sdr.clientId) || sdr.clientId
        : ''
      return {
        name: isDuplicate && clientLabel ? `${sdr.name} (${clientLabel})` : sdr.name,
        dials: sdr.totalDials,
        answered: sdr.totalAnswered,
        dms: sdr.totalDMs,
        sqls: sdr.totalSQLs,
      }
    })
  }, [leaderboard, rpcData])

  return {
    loading,
    error,
    snapshots: [],
    leaderboard,
    previousLeaderboard,
    activityChartData,
    refetch: fetchData,
  }
}
