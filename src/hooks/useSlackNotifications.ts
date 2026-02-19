import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { sendSlackNotification, formatSQLNotification } from '@/lib/slackNotifications'

export const useSlackNotifications = () => {
  const processedIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    const channel = supabase
      .channel('sql-slack-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sql_meetings',
        },
        async (payload) => {
          const newRecord = payload.new as any
          if (processedIds.current.has(newRecord.id)) return
          processedIds.current.add(newRecord.id)

          try {
            // Get notification settings (first available admin settings)
            const { data: settings } = await supabase
              .from('notification_settings')
              .select('slack_webhook_url, report_content')
              .not('slack_webhook_url', 'is', null)
              .limit(1)
              .maybeSingle()

            if (!settings?.slack_webhook_url) return

            const content = (settings.report_content as Record<string, boolean>) || {}
            if (content.sqlNotifications === false) return

            const message = formatSQLNotification(newRecord)
            await sendSlackNotification(settings.slack_webhook_url, message)
            console.log('✅ Slack SQL notification sent for:', newRecord.contact_person)
          } catch (error) {
            console.error('Error sending Slack SQL notification:', error)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to SQL meetings for Slack notifications')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
}
