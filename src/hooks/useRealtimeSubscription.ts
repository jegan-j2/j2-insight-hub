import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface RealtimeSubscriptionOptions {
  table: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string
  onChange?: () => void
}

export const useRealtimeSubscription = ({
  table,
  event = '*',
  filter,
  onChange,
}: RealtimeSubscriptionOptions) => {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

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
        onChangeRef.current?.()
      }
    )

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Subscribed to ${table} updates`)
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, event, filter])
}
