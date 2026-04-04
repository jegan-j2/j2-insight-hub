import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { DailySnapshot } from '@/lib/supabase-types'
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

export const useTeamPerformanceData = (dateRange: DateRange | undefined, clientFilter?: string) => {
  const [loading, setLoading] = useState(true)
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([])
  const [prevSnapshots, setPrevSnapshots] = useState<DailySnapshot[]>([])
  const [activityLogs, setActivityLogs] = useState<{ sdr_name: string; client_id: string; call_duration: number }[]>([])
  const [error, setError] = useState<string | null>(null)

  const startDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''
  const endDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''

  // Calculate previous period dates (same duration, immediately before)
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

      let query = supabase
        .from('daily_snapshots')
        .select('*')
        .gte('snapshot_date', startDate)
        .lte('snapshot_date', endDate)

      if (clientFilter && clientFilter !== 'all') {
        query = query.eq('client_id', clientFilter)
      }

      let activityQuery = supabase
        .from('activity_log')
        .select('sdr_name, client_id, call_duration')
        .ilike('call_outcome', 'connected')
        .not('call_duration', 'is', null)
        .gt('call_duration', 0)
        .gte('activity_date', `${startDate}T00:00:00`)
        .lte('activity_date', `${endDate}T23:59:59`)

      if (clientFilter && clientFilter !== 'all') {
        activityQuery = activityQuery.eq('client_id', clientFilter)
      }

      // Previous period query
      let prevQuery = prevDates.start && prevDates.end
        ? supabase
            .from('daily_snapshots')
            .select('*')
            .gte('snapshot_date', prevDates.start)
            .lte('snapshot_date', prevDates.end)
        : null

      if (prevQuery && clientFilter && clientFilter !== 'all') {
        prevQuery = prevQuery.eq('client_id', clientFilter)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const promises: any[] = [
        query.order('snapshot_date', { ascending: false }),
        activityQuery,
      ]
      if (prevQuery) promises.push(prevQuery)

      const results = await Promise.all(promises)

      const { data, error: fetchError } = results[0]
      const { data: callData } = results[1]

      if (fetchError) throw fetchError

      setSnapshots(data || [])
      setActivityLogs((callData || []).filter((c: any) => c.sdr_name !== null) as { sdr_name: string; client_id: string; call_duration: number }[])
      setPrevSnapshots(results[2]?.data || [])
    } catch (err) {
      console.error('Error fetching team performance data:', err)
      setError('Failed to load team performance data')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, clientFilter, prevDates.start, prevDates.end])

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await fetchData();
      } catch {
        if (!cancelled) {
          await new Promise(r => setTimeout(r, 2000));
          if (!cancelled) fetchData();
        }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [fetchData]);

  useRealtimeSubscription({
    table: 'daily_snapshots',
    onChange: fetchData,
  })

  const leaderboard: LeaderboardEntry[] = useMemo(() => {
    const compositeKey = (name: string, clientId: string) => `${name}|||${clientId}`
    const grouped = snapshots.reduce((acc, snapshot) => {
      const key = compositeKey(snapshot.sdr_name, snapshot.client_id || '')
      const existing = acc.find(item => item.key === key)

      if (existing) {
        existing.totalDials += snapshot.dials ?? 0
        existing.totalAnswered += snapshot.answered ?? 0
        existing.totalDMs += snapshot.dms_reached ?? 0
        existing.totalSQLs += snapshot.sqls ?? 0
      } else {
        const nameParts = snapshot.sdr_name.split(' ')
        const initials = nameParts.map(p => p[0]).join('').toUpperCase().slice(0, 2)
        acc.push({
          key,
          name: snapshot.sdr_name,
          clientId: snapshot.client_id || '',
          initials,
          totalDials: snapshot.dials ?? 0,
          totalAnswered: snapshot.answered ?? 0,
          totalDMs: snapshot.dms_reached ?? 0,
          totalSQLs: snapshot.sqls ?? 0,
        })
      }

      return acc
    }, [] as Array<{ key: string; name: string; clientId: string; initials: string; totalDials: number; totalAnswered: number; totalDMs: number; totalSQLs: number }>)

    grouped.sort((a, b) => b.totalSQLs - a.totalSQLs)

    // Calculate avg duration per SDR+client from activity logs
    const durationMap = new Map<string, { total: number; count: number }>()
    for (const log of activityLogs) {
      const key = compositeKey(log.sdr_name, log.client_id || '')
      const entry = durationMap.get(key) || { total: 0, count: 0 }
      entry.total += log.call_duration
      entry.count += 1
      durationMap.set(key, entry)
    }

    return grouped.map((sdr, index) => {
      const durInfo = durationMap.get(sdr.key)
      const avgDuration = durInfo ? durInfo.total / durInfo.count : 0
      return {
        name: sdr.name,
        clientId: sdr.clientId,
        initials: sdr.initials,
        totalDials: sdr.totalDials,
        totalAnswered: sdr.totalAnswered,
        totalDMs: sdr.totalDMs,
        totalSQLs: sdr.totalSQLs,
        rank: index + 1,
        answerRate: sdr.totalDials > 0 ? (sdr.totalAnswered / sdr.totalDials * 100).toFixed(1) : '0',
        conversionRate: sdr.totalDials > 0 ? (sdr.totalSQLs / sdr.totalDials * 100).toFixed(2) : '0',
        trend: 0,
        avgDuration,
      }
    })
  }, [snapshots, activityLogs])

  // Previous period leaderboard for "Most Improved" calculation
  const previousLeaderboard: LeaderboardEntry[] = useMemo(() => {
    const compositeKey = (name: string, clientId: string) => `${name}|||${clientId}`
    const grouped = prevSnapshots.reduce((acc, snapshot) => {
      const key = compositeKey(snapshot.sdr_name, snapshot.client_id || '')
      const existing = acc.find(item => item.key === key)
      if (existing) {
        existing.totalDials += snapshot.dials
        existing.totalAnswered += snapshot.answered
        existing.totalDMs += snapshot.dms_reached
        existing.totalSQLs += snapshot.sqls
      } else {
        const nameParts = snapshot.sdr_name.split(' ')
        const initials = nameParts.map(p => p[0]).join('').toUpperCase().slice(0, 2)
        acc.push({ key, name: snapshot.sdr_name, clientId: snapshot.client_id || '', initials, totalDials: snapshot.dials, totalAnswered: snapshot.answered, totalDMs: snapshot.dms_reached, totalSQLs: snapshot.sqls })
      }
      return acc
    }, [] as Array<{ key: string; name: string; clientId: string; initials: string; totalDials: number; totalAnswered: number; totalDMs: number; totalSQLs: number }>)

    return grouped.map((sdr, index) => ({
      name: sdr.name,
      clientId: sdr.clientId,
      initials: sdr.initials,
      totalDials: sdr.totalDials,
      totalAnswered: sdr.totalAnswered,
      totalDMs: sdr.totalDMs,
      totalSQLs: sdr.totalSQLs,
      rank: index + 1,
      answerRate: sdr.totalDials > 0 ? (sdr.totalAnswered / sdr.totalDials * 100).toFixed(1) : '0',
      conversionRate: sdr.totalDials > 0 ? (sdr.totalSQLs / sdr.totalDials * 100).toFixed(2) : '0',
      trend: 0,
      avgDuration: 0,
    }))
  }, [prevSnapshots])

  // Chart data for SDR Activity Breakdown
  const activityChartData = useMemo(() => {
    return leaderboard.map(sdr => ({
      name: sdr.name,
      dials: sdr.totalDials,
      answered: sdr.totalAnswered,
      dms: sdr.totalDMs,
      sqls: sdr.totalSQLs,
    }))
  }, [leaderboard])

  return {
    loading,
    error,
    snapshots,
    leaderboard,
    previousLeaderboard,
    activityChartData,
    refetch: fetchData,
  }
}
