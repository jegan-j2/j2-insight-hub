import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { sendSlackNotification } from '@/lib/slackNotifications'

export const useInactiveSDRAlerts = () => {
  const alertedSDRs = useRef<Set<string>>(new Set())
  const batchSent = useRef(false)

  useEffect(() => {
    const checkInactiveSDRs = async () => {
      const now = new Date()
      const melbourneTime = new Date(
        now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' })
      )
      const hour = melbourneTime.getHours()
      const day = melbourneTime.getDay()

      if (day === 0 || day === 6 || hour < 9 || hour >= 17) return

      try {
        const { data: settings } = await supabase
          .from('notification_settings')
          .select('slack_webhook_url, report_content')
          .not('slack_webhook_url', 'is', null)
          .limit(1)
          .maybeSingle()

        if (!settings?.slack_webhook_url) return

        const content = (settings.report_content as Record<string, boolean>) || {}
        if (content.inactiveAlerts === false) return

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

        const { data: recentActivity } = await supabase
          .from('activity_log')
          .select('sdr_name')
          .gte('activity_date', oneHourAgo)

        const activeNames = new Set(recentActivity?.map((a) => a.sdr_name) || [])

        // Only fetch SDRs (exclude managers/admins)
        const { data: allSDRs } = await supabase
          .from('team_members')
          .select('sdr_name, client_id, role')
          .eq('status', 'active')
          .eq('role', 'SDR')

        if (!allSDRs) return

        // Check if any previously inactive SDR became active again
        for (const name of alertedSDRs.current) {
          if (activeNames.has(name)) {
            alertedSDRs.current.delete(name)
            batchSent.current = false
          }
        }

        // Find newly inactive SDRs not yet alerted
        const newlyInactive = allSDRs.filter(
          (sdr) => !activeNames.has(sdr.sdr_name) && !alertedSDRs.current.has(sdr.sdr_name)
        )

        console.log(`✅ Found ${newlyInactive.length} inactive SDRs (checked ${allSDRs.length} total)`)

        if (newlyInactive.length === 0) return
        if (batchSent.current) return

        // Mark all as alerted
        newlyInactive.forEach((sdr) => alertedSDRs.current.add(sdr.sdr_name))
        batchSent.current = true

        // Build batched message
        const sdrList = newlyInactive
          .map((sdr) => `• ${sdr.sdr_name} (${sdr.client_id || 'N/A'})`)
          .join('\n')

        const timeStr = new Date().toLocaleTimeString('en-AU', { timeZone: 'Australia/Melbourne' })
        const count = newlyInactive.length
        const message = {
          text: `⚠️ *Inactive SDR Alert*\n\n*${count} SDR${count > 1 ? 's' : ''} ha${count > 1 ? 've' : 's'} no activity in over 1 hour:*\n\n${sdrList}\n\n⏰ *Last checked:* ${timeStr}`,
        }

        console.log('📤 Sending batched inactive alert to Slack')
        await sendSlackNotification(settings.slack_webhook_url, message)
        console.log('⚠️ Batched inactive SDR alert sent for:', newlyInactive.map((s) => s.sdr_name).join(', '))
      } catch (error) {
        console.error('Error checking inactive SDRs:', error)
      }
    }

    checkInactiveSDRs()
    const interval = setInterval(checkInactiveSDRs, 15 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])
}
