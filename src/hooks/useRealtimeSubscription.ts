import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface RealtimeSubscriptionOptions {
  table: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string
  onChange?: () => void
  showNotification?: boolean
}

export const useRealtimeSubscription = ({
  table,
  event = '*',
  filter,
  onChange,
  showNotification = false
}: RealtimeSubscriptionOptions) => {
  const { toast } = useToast()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const channelName = `realtime-${table}-${filter || 'all'}-${Date.now()}`

    const channel = supabase.channel(channelName).on(
      'postgres_changes',
      {
        event,
        schema: 'public',
        table,
        ...(filter ? { filter } : {}),
      },
      (payload) => {
        console.log(`Realtime update on ${table}:`, payload.eventType)

        if (onChange) onChange()

        if (showNotification) {
          if (payload.eventType === 'INSERT' && table === 'sql_meetings') {
            toast({
              title: '🎉 New SQL Booked!',
              description: 'Dashboard updated with new meeting',
              duration: 3000,
            })
          } else if (payload.eventType === 'UPDATE') {
            toast({
              title: '📊 Data Updated',
              description: 'Dashboard refreshed with latest data',
              duration: 2000,
            })
          }
        }
      }
    )

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Subscribed to ${table} updates`)
      }
    })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [table, event, filter])
}
