import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { sendSlackNotification, formatInactiveSDRAlert } from '@/lib/slackNotifications'

export const useInactiveSDRAlerts = () => {
  const alertedSDRs = useRef<Set<string>>(new Set())

  useEffect(() => {
    const checkInactiveSDRs = async () => {
      // Only check during business hours (9 AM - 5 PM Melbourne)
      const now = new Date()
      const melbourneTime = new Date(
        now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' })
      )
      const hour = melbourneTime.getHours()
      const day = melbourneTime.getDay()

      // Skip weekends and outside business hours
      if (day === 0 || day === 6 || hour < 9 || hour >= 17) return

      try {
        // Get notification settings
        const { data: settings } = await supabase
          .from('notification_settings')
          .select('slack_webhook_url, report_content')
          .not('slack_webhook_url', 'is', null)
          .limit(1)
          .maybeSingle()

        if (!settings?.slack_webhook_url) return

        const content = (settings.report_content as Record<string, boolean>) || {}
        if (content.inactiveAlerts === false) return

        // Get SDRs with activity in last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

        const { data: recentActivity } = await supabase
          .from('activity_log')
          .select('sdr_name')
          .gte('activity_date', oneHourAgo)

        const activeNames = new Set(recentActivity?.map((a) => a.sdr_name) || [])

        // Get all active SDRs
        const { data: allSDRs } = await supabase
          .from('team_members')
          .select('sdr_name, client_id')
          .eq('status', 'active')

        if (!allSDRs) return

        // Find inactive SDRs not yet alerted
        for (const sdr of allSDRs) {
          if (activeNames.has(sdr.sdr_name)) {
            // SDR is active again, remove from alerted set
            alertedSDRs.current.delete(sdr.sdr_name)
            continue
          }

          if (alertedSDRs.current.has(sdr.sdr_name)) continue

          const message = formatInactiveSDRAlert(sdr.sdr_name, sdr.client_id)
          await sendSlackNotification(settings.slack_webhook_url, message)
          alertedSDRs.current.add(sdr.sdr_name)
          console.log('⚠️ Inactive SDR alert sent for:', sdr.sdr_name)
        }
      } catch (error) {
        console.error('Error checking inactive SDRs:', error)
      }
    }

    // Check immediately, then every 15 minutes
    checkInactiveSDRs()
    const interval = setInterval(checkInactiveSDRs, 15 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])
}
