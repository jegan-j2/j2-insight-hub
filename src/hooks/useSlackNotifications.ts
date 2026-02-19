import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { sendSlackNotification, formatSQLNotification } from '@/lib/slackNotifications'
import { useBrowserNotifications } from './useBrowserNotifications'

export const useSlackNotifications = () => {
  const processedIds = useRef<Set<string>>(new Set())
  const { showNotification } = useBrowserNotifications()
  const showNotificationRef = useRef(showNotification)
  showNotificationRef.current = showNotification

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

            const content = (settings?.report_content as Record<string, boolean>) || {}

            // Send Slack notification
            if (settings?.slack_webhook_url && content.sqlNotifications !== false) {
              const message = formatSQLNotification(newRecord)
              await sendSlackNotification(settings.slack_webhook_url, message)
              console.log('✅ Slack SQL notification sent for:', newRecord.contact_person)
            }

            // Show browser notification (check user's own settings)
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              const { data: userSettings } = await supabase
                .from('notification_settings')
                .select('report_content')
                .eq('user_id', user.id)
                .maybeSingle()

              const userContent = (userSettings?.report_content as Record<string, boolean>) || {}
              if (userContent.browserNotifications !== false) {
                const sdrName = newRecord.sdr_name || 'Unknown SDR'
                const contactPerson = newRecord.contact_person || 'Unknown Contact'
                const companyName = newRecord.company_name || 'Unknown Company'

                showNotificationRef.current('🎉 New SQL Booked!', {
                  body: `${sdrName} booked ${contactPerson} (${companyName})`,
                  tag: `sql-notification-${newRecord.id}`,
                  icon: '/favicon.png',
                })
              }
            }
          } catch (error) {
            console.error('Error sending SQL notification:', error)
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
