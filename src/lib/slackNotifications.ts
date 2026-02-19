interface SlackMessage {
  text: string
  blocks?: any[]
}

export const sendSlackNotification = async (
  webhookUrl: string,
  message: SlackMessage
): Promise<boolean> => {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      console.error('Slack notification failed:', response.status)
      return false
    }
    return true
  } catch (error) {
    console.error('Slack notification error:', error)
    return false
  }
}

export const formatSQLNotification = (sql: any) => {
  return {
    text: `🎉 New SQL Booked by ${sql.sdr_name}!`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🎉 *New SQL Booked!*\n\n*Client:* ${sql.client_id || 'N/A'}\n*SDR:* ${sql.sdr_name || 'N/A'}\n*Contact:* ${sql.contact_person} (${sql.company_name || 'N/A'})\n*Booked:* ${new Date(sql.booking_date).toLocaleDateString()}\n*Meeting Date:* ${sql.meeting_date ? new Date(sql.meeting_date).toLocaleDateString() : 'TBD'}`,
        },
      },
    ],
  }
}

export const formatInactiveSDRAlert = (sdrName: string, clientId: string | null) => {
  return {
    text: `⚠️ ${sdrName} is inactive`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⚠️ *SDR Inactive Alert*\n\n*SDR:* ${sdrName}\n*Client:* ${clientId || 'N/A'}\n⏰ *Status:* No calling activity in over 1 hour`,
        },
      },
    ],
  }
}

export const formatTestMessage = () => {
  return {
    text: '🧪 Test notification from J2 Insight Hub - Slack integration working!',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '🧪 *Test Notification*\n\nThis is a test message from J2 Insight Hub. Your Slack integration is working correctly! ✅',
        },
      },
    ],
  }
}
