export interface Client {
  id: string
  client_id: string
  client_name: string
  logo_url?: string
  banner_url?: string
  banner_gradient?: string
  campaign_start?: string
  campaign_end?: string
  target_sqls?: number
  status: 'active' | 'paused' | 'completed'
  created_at: string
}

export interface DailySnapshot {
  id: string
  client_id: string
  sdr_name: string
  snapshot_date: string
  dials: number
  answered: number
  answer_rate: number
  voicemails: number
  no_answers: number
  dms_reached: number
  mqls: number
  sqls: number
  created_at: string
  updated_at: string
}

export interface SQLMeeting {
  id: string
  client_id: string
  sdr_name: string
  contact_person: string
  contact_email?: string
  company_name: string
  booking_date: string
  meeting_date?: string
  meeting_held: boolean
  meeting_status?: string
  remarks?: string
  client_notes?: string
  edited_in_dashboard: boolean
  last_edited_by?: string
  last_edited_at?: string
  created_at: string
}

export interface TeamMember {
  id: string
  sdr_name: string
  sdr_first_name: string
  email: string
  role: string
  status: 'active' | 'inactive'
  created_at: string
}

export interface ActivityLog {
  id: string
  client_id: string
  sdr_name: string
  activity_type: 'call' | 'email' | 'meeting' | 'note'
  activity_date: string
  call_outcome?: string
  call_duration?: number
  contact_name?: string
  company_name?: string
  created_at: string
}
