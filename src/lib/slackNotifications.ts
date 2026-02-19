import { supabase } from './supabase'

interface SlackMessage {
  text: string
}

export const sendSlackNotification = async (
  webhookUrl: string,
  message: SlackMessage
): Promise<boolean> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-slack-notification`

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ webhookUrl, message }),
    })

    if (!response.ok) {
      console.error('Edge function failed:', response.status)
      return false
    }

    const result = await response.json()
    return result.success === true
  } catch (error) {
    console.error('Slack notification error:', error)
    return false
  }
}

export const formatSQLNotification = (sql: any) => {
  const bookingDate = sql.booking_date ? new Date(sql.booking_date).toLocaleDateString() : 'N/A'
  const meetingDate = sql.meeting_date ? new Date(sql.meeting_date).toLocaleDateString() : 'TBD'

  return {
    text: `🎉 *New SQL Booked!*\n\n*Client:* ${sql.client_id || 'N/A'}\n*SDR:* ${sql.sdr_name || 'N/A'}\n*Contact:* ${sql.contact_person} (${sql.company_name || 'N/A'})\n*Booked:* ${bookingDate}\n*Meeting Date:* ${meetingDate}`
  }
}

export const formatInactiveSDRAlert = (sdrName: string, clientId: string | null) => {
  return {
    text: `⚠️ *SDR Inactive Alert*\n\n*SDR:* ${sdrName}\n*Client:* ${clientId || 'N/A'}\n⏰ *Status:* No calling activity in over 1 hour`
  }
}

export const formatTestMessage = () => {
  return {
    text: '🧪 Test notification from J2 Insight Hub - Slack integration working!'
  }
}
