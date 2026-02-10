import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { DailySnapshot } from '@/lib/supabase-types'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'

interface LeaderboardEntry {
  rank: number
  name: string
  initials: string
  totalDials: number
  totalAnswered: number
  totalDMs: number
  totalSQLs: number
  answerRate: string
  conversionRate: string
  trend: number
}

export const useTeamPerformanceData = (dateRange: DateRange | undefined, clientFilter?: string) => {
  const [loading, setLoading] = useState(true)
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([])
  const [error, setError] = useState<string | null>(null)

  const startDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''
  const endDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''

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

      const { data, error: fetchError } = await query.order('snapshot_date', { ascending: false })

      if (fetchError) throw fetchError

      setSnapshots(data || [])
    } catch (err) {
      console.error('Error fetching team performance data:', err)
      setError('Failed to load team performance data')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, clientFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const leaderboard: LeaderboardEntry[] = useMemo(() => {
    const grouped = snapshots.reduce((acc, snapshot) => {
      const existing = acc.find(item => item.name === snapshot.sdr_name)

      if (existing) {
        existing.totalDials += snapshot.dials
        existing.totalAnswered += snapshot.answered
        existing.totalDMs += snapshot.dms_reached
        existing.totalSQLs += snapshot.sqls
      } else {
        const nameParts = snapshot.sdr_name.split(' ')
        const initials = nameParts.map(p => p[0]).join('').toUpperCase().slice(0, 2)
        acc.push({
          name: snapshot.sdr_name,
          initials,
          totalDials: snapshot.dials,
          totalAnswered: snapshot.answered,
          totalDMs: snapshot.dms_reached,
          totalSQLs: snapshot.sqls,
        })
      }

      return acc
    }, [] as Array<{ name: string; initials: string; totalDials: number; totalAnswered: number; totalDMs: number; totalSQLs: number }>)

    grouped.sort((a, b) => b.totalSQLs - a.totalSQLs)

    return grouped.map((sdr, index) => ({
      ...sdr,
      rank: index + 1,
      answerRate: sdr.totalDials > 0 ? (sdr.totalAnswered / sdr.totalDials * 100).toFixed(1) : '0',
      conversionRate: sdr.totalDials > 0 ? (sdr.totalSQLs / sdr.totalDials * 100).toFixed(2) : '0',
      trend: 0, // Trend calculation requires previous period data
    }))
  }, [snapshots])

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
    activityChartData,
    refetch: fetchData,
  }
}
