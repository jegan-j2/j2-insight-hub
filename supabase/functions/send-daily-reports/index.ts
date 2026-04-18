import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const NAVY = '#0F172A'
const ZEBRA = '#F1F5F9'
const BORDER = '#E2E8F0'
const MUTED = '#64748B'
const LOGO_URL = 'https://eaeqkgjhgdykxwjkaxpj.supabase.co/storage/v1/object/public/branding/j2_logo_new_lightmode.png'

function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function pct(num: number, den: number, digits = 1): string {
  if (!den) return '0.0%'
  return `${((num / den) * 100).toFixed(digits)}%`
}

function workingDaysBetween(from: Date, to: Date): number {
  if (to < from) return 0
  let count = 0
  const cur = new Date(from)
  while (cur <= to) {
    const d = cur.getUTCDay()
    if (d !== 0 && d !== 6) count++
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return count
}

function tableOpen(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-size:13px;color:#0f172a;">`
}

function thRow(cols: string[]): string {
  return `<tr>${cols.map(c => `<th align="left" style="background:${NAVY};color:#fff;font-weight:700;padding:10px 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.3px;border:1px solid ${NAVY};">${c}</th>`).join('')}</tr>`
}

function dataRow(cols: string[], idx: number): string {
  const bg = idx % 2 === 0 ? '#FFFFFF' : ZEBRA
  return `<tr>${cols.map(c => `<td style="background:${bg};padding:10px 12px;border:1px solid ${BORDER};vertical-align:top;">${c}</td>`).join('')}</tr>`
}

function sectionHeader(title: string): string {
  return `<div style="background:${NAVY};color:#fff;padding:12px 16px;border-radius:8px 8px 0 0;font-weight:600;font-size:14px;margin-top:28px;">${escapeHtml(title)}</div>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (!settings?.report_emails) {
      return new Response(JSON.stringify({ error: 'No report email addresses configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Yesterday in Melbourne timezone (YYYY-MM-DD)
    const melbStr = new Date().toLocaleString('en-CA', {
      timeZone: 'Australia/Melbourne',
      year: 'numeric', month: '2-digit', day: '2-digit',
    })
    const todayMelb = new Date(`${melbStr}T00:00:00Z`)
    const yesterday = new Date(todayMelb)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const reportDate = yesterday.toISOString().split('T')[0]

    // Melbourne day boundaries (AEST/AEDT — use +10/+11 conservatively as +10:00)
    const dayStart = `${reportDate}T00:00:00+10:00`
    const dayEnd = `${reportDate}T23:59:59+11:00`

    // ===== Pull activity_log for the day =====
    let allActivity: any[] = []
    let from = 0
    const pageSize = 1000
    while (true) {
      const { data, error } = await supabase
        .from('activity_log')
        .select('sdr_name, client_id, call_outcome, is_decision_maker, hubspot_engagement_id, activity_date')
        .gte('activity_date', dayStart)
        .lte('activity_date', dayEnd)
        .range(from, from + pageSize - 1)
      if (error) break
      if (!data || data.length === 0) break
      allActivity = allActivity.concat(data)
      if (data.length < pageSize) break
      from += pageSize
    }

    // ===== Pull SQL meetings booked on report date =====
    const { data: sqlMeetings } = await supabase
      .from('sql_meetings')
      .select('sdr_name, client_id, contact_person, company_name, meeting_date, meeting_status')
      .eq('booking_date', reportDate)
      .not('meeting_status', 'in', '(cancelled,no_show)')

    // ===== Pull active clients =====
    const { data: clients } = await supabase
      .from('clients')
      .select('client_id, client_name, campaign_start, campaign_end, target_sqls')
      .eq('status', 'active')
      .neq('client_id', 'admin')

    // ===== Aggregations =====
    type AggRow = { sdr_name: string; client_id: string; dials: number; answered: number; dms: number; sqls: number }
    const byKey = new Map<string, AggRow>()
    const keyOf = (sdr: string, cid: string) => `${sdr}||${cid}`

    for (const a of allActivity) {
      const sdr = a.sdr_name || 'Unknown'
      const cid = a.client_id || 'unknown'
      const k = keyOf(sdr, cid)
      const row = byKey.get(k) || { sdr_name: sdr, client_id: cid, dials: 0, answered: 0, dms: 0, sqls: 0 }
      row.dials++
      if (a.call_outcome === 'connected') row.answered++
      if (a.is_decision_maker === true) row.dms++
      byKey.set(k, row)
    }

    for (const m of (sqlMeetings || [])) {
      const sdr = m.sdr_name || 'Unknown'
      const cid = m.client_id || 'unknown'
      const k = keyOf(sdr, cid)
      const row = byKey.get(k) || { sdr_name: sdr, client_id: cid, dials: 0, answered: 0, dms: 0, sqls: 0 }
      row.sqls++
      byKey.set(k, row)
    }

    const allRows = Array.from(byKey.values())

    // Overview totals
    const totalDials = allRows.reduce((s, r) => s + r.dials, 0)
    const totalAnswered = allRows.reduce((s, r) => s + r.answered, 0)
    const totalDMs = allRows.reduce((s, r) => s + r.dms, 0)
    const totalSQLs = (sqlMeetings || []).length
    const answerRate = pct(totalAnswered, totalDials, 1)
    const convRate = pct(totalSQLs, totalDials, 2)

    // Per-client aggregation
    type ClientAgg = { client_id: string; dials: number; answered: number; dms: number; sqls: number }
    const clientMap = new Map<string, ClientAgg>()
    for (const r of allRows) {
      const c = clientMap.get(r.client_id) || { client_id: r.client_id, dials: 0, answered: 0, dms: 0, sqls: 0 }
      c.dials += r.dials
      c.answered += r.answered
      c.dms += r.dms
      c.sqls += r.sqls
      clientMap.set(r.client_id, c)
    }

    // Per-SDR aggregation (sum across clients)
    type SdrAgg = { sdr_name: string; dials: number; answered: number; dms: number; sqls: number }
    const sdrMap = new Map<string, SdrAgg>()
    for (const r of allRows) {
      const s = sdrMap.get(r.sdr_name) || { sdr_name: r.sdr_name, dials: 0, answered: 0, dms: 0, sqls: 0 }
      s.dials += r.dials
      s.answered += r.answered
      s.dms += r.dms
      s.sqls += r.sqls
      sdrMap.set(r.sdr_name, s)
    }
    const sdrSorted = Array.from(sdrMap.values()).sort((a, b) => (b.sqls - a.sqls) || (b.dials - a.dials))

    // ===== Build HTML =====
    const today = new Date(`${reportDate}T00:00:00Z`)

    // Section 1 — Campaign Overview
    const overviewHtml = `
      ${sectionHeader('Campaign Overview')}
      <div style="border:1px solid ${BORDER};border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">
        ${tableOpen()}
          ${thRow(['Total Dials','Total Answered','Answer Rate','DM Conversations','SQLs Booked','Conversion Rate'])}
          ${dataRow([
            totalDials.toLocaleString(),
            totalAnswered.toLocaleString(),
            answerRate,
            totalDMs.toLocaleString(),
            totalSQLs.toLocaleString(),
            convRate,
          ], 0)}
        </table>
      </div>`

    // Section 2 — Client Performance
    const clientRowsHtml = (clients || [])
      .map(c => {
        const agg = clientMap.get(c.client_id) || { dials: 0, answered: 0, dms: 0, sqls: 0 }
        const target = c.target_sqls || 0
        const targetPct = target > 0 ? `${((agg.sqls / target) * 100).toFixed(0)}%` : '—'
        const vsTarget = target > 0 ? `${agg.sqls}/${target} ${targetPct}` : `${agg.sqls}/—`
        let daysLeft: string = '—'
        if (c.campaign_end) {
          const end = new Date(`${c.campaign_end}T00:00:00Z`)
          const days = workingDaysBetween(today, end)
          daysLeft = `${days}`
        }
        return { name: c.client_name, agg, vsTarget, daysLeft }
      })
      .sort((a, b) => b.agg.sqls - a.agg.sqls || b.agg.dials - a.agg.dials)
      .map((c, i) => dataRow([
        escapeHtml(c.name),
        c.agg.dials.toLocaleString(),
        c.agg.answered.toLocaleString(),
        pct(c.agg.answered, c.agg.dials),
        c.agg.dms.toLocaleString(),
        c.agg.sqls.toLocaleString(),
        escapeHtml(c.vsTarget),
        escapeHtml(c.daysLeft),
      ], i)).join('')

    const clientHtml = `
      ${sectionHeader('Client Performance')}
      <div style="border:1px solid ${BORDER};border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">
        ${tableOpen()}
          ${thRow(['Client','Dials','Answered','Ans Rate','DMs','SQLs','vs Target','Days Left'])}
          ${clientRowsHtml || dataRow(['<em style="color:'+MUTED+'">No client activity</em>','','','','','','',''], 0)}
        </table>
      </div>`

    // Section 3 — Team Performance Summary
    const medals = ['🥇', '🥈', '🥉']
    const teamRowsHtml = sdrSorted.map((s, i) => {
      const medal = i < 3 ? `${medals[i]} ` : ''
      return dataRow([
        `${medal}${escapeHtml(s.sdr_name)}`,
        s.dials.toLocaleString(),
        s.answered.toLocaleString(),
        pct(s.answered, s.dials),
        s.dms.toLocaleString(),
        s.sqls.toLocaleString(),
      ], i)
    }).join('')

    const teamHtml = `
      ${sectionHeader('Team Performance Summary')}
      <div style="border:1px solid ${BORDER};border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">
        ${tableOpen()}
          ${thRow(['SDR','Dials','Answered','Ans Rate','DMs','SQLs'])}
          ${teamRowsHtml || dataRow(['<em style="color:'+MUTED+'">No SDR activity</em>','','','','',''], 0)}
        </table>
      </div>`

    // Section 4 — SQL Booked Meetings (only if any)
    let sqlHtml = ''
    if (totalSQLs > 0) {
      const sqlRowsHtml = (sqlMeetings || []).map((m, i) => dataRow([
        escapeHtml(m.contact_person || '—'),
        escapeHtml(m.company_name || '—'),
        escapeHtml(m.sdr_name || '—'),
        escapeHtml(m.meeting_date || 'TBD'),
      ], i)).join('')
      sqlHtml = `
        ${sectionHeader(`SQL Booked Meetings (${totalSQLs})`)}
        <div style="border:1px solid ${BORDER};border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">
          ${tableOpen()}
            ${thRow(['Contact','Company','SDR','Meeting Date'])}
            ${sqlRowsHtml}
          </table>
        </div>`
    }

    // Section 5 — Detailed Activity Breakdown (per SDR x Client)
    const detailRowsHtml = allRows
      .sort((a, b) => (b.sqls - a.sqls) || (b.dials - a.dials))
      .map((r, i) => dataRow([
        escapeHtml(r.sdr_name),
        r.dials.toLocaleString(),
        r.answered.toLocaleString(),
        pct(r.answered, r.dials),
        r.dms.toLocaleString(),
        r.sqls.toLocaleString(),
        pct(r.sqls, r.dials, 2),
      ], i)).join('')

    const detailHtml = `
      ${sectionHeader('Detailed Activity Breakdown')}
      <div style="border:1px solid ${BORDER};border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">
        ${tableOpen()}
          ${thRow(['SDR','Dials','Answered','Ans Rate','DMs','SQLs','Conv Rate'])}
          ${detailRowsHtml || dataRow(['<em style="color:'+MUTED+'">No activity</em>','','','','','',''], 0)}
        </table>
      </div>`

    const formattedDate = new Date(`${reportDate}T00:00:00Z`).toLocaleDateString('en-AU', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

    const emailHtml = `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;padding:32px 16px;margin:0;color:#0f172a;">
  <div style="max-width:780px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="background:${NAVY};padding:32px 24px;text-align:center;">
      <img src="${LOGO_URL}" width="72" alt="J2 Group" style="display:block;margin:0 auto 16px;border-radius:50%;" />
      <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:600;letter-spacing:-0.2px;">Daily Performance Report</h1>
      <p style="color:#94a3b8;margin:6px 0 0;font-size:14px;">${escapeHtml(formattedDate)}</p>
    </div>
    <div style="padding:24px;">
      ${overviewHtml}
      ${clientHtml}
      ${teamHtml}
      ${sqlHtml}
      ${detailHtml}
    </div>
    <div style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid ${BORDER};">
      <p style="color:${MUTED};font-size:12px;margin:0 0 6px;">You're receiving this because you're subscribed to J2 Insights reports.</p>
      <p style="color:#94a3b8;font-size:12px;margin:0;">© 2026 J2 Group · Melbourne, Australia</p>
    </div>
  </div>
</body>
</html>`.trim()

    // Slack summary (kept brief)
    if (settings.slack_webhook_url) {
      const content = (settings.report_content as Record<string, boolean>) || {}
      if (content.dailyReport !== false) {
        const slackText = `📊 *Daily Performance Report — ${reportDate}*\n` +
          `📞 Dials: ${totalDials.toLocaleString()}\n` +
          `✅ Answered: ${totalAnswered.toLocaleString()} (${answerRate})\n` +
          `🤝 DM Conversations: ${totalDMs.toLocaleString()}\n` +
          `🎯 SQLs Booked: ${totalSQLs.toLocaleString()}\n` +
          `📈 Conversion Rate: ${convRate}`
        await fetch(settings.slack_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: slackText }),
        })
      }
    }

    // Send via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      const emailAddresses = settings.report_emails.split(',').map((e: string) => e.trim()).filter(Boolean)
      for (const to of emailAddresses) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: 'J2 Insight Hub <admin-support@j2group.com.au>',
            to,
            subject: `Daily Performance Report — ${reportDate}`,
            html: emailHtml,
          }),
        })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      date: reportDate,
      totals: { dials: totalDials, answered: totalAnswered, dms: totalDMs, sqls: totalSQLs },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
