import { useState } from 'react'
import { supabase, getCurrentUser } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { getSafeErrorMessage } from '@/lib/safeError'

export const useMeetingUpdate = () => {
  const [updating, setUpdating] = useState<string | null>(null)
  const { toast } = useToast()

  const updateMeetingHeld = async (meetingId: string, newValue: boolean) => {
    try {
      setUpdating(meetingId)
      const user = await getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('sql_meetings')
        .update({
          meeting_held: newValue,
          edited_in_dashboard: true,
          last_edited_by: user.email,
          last_edited_at: new Date().toISOString()
        })
        .eq('id', meetingId)

      if (error) throw error
      toast({ title: 'Meeting status updated', className: 'border-[#10b981] text-[#10b981]', duration: 2000 })
      return true
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error updating meeting status:', error)
      toast({ title: 'Error', description: getSafeErrorMessage(error), variant: 'destructive', duration: 3000 })
      return false
    } finally {
      setUpdating(null)
    }
  }

  const updateMeetingStatus = async (meetingId: string, status: string) => {
    try {
      setUpdating(meetingId)
      const user = await getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('sql_meetings')
        .update({
          meeting_status: status,
          meeting_held: status === 'held',
          edited_in_dashboard: true,
          last_edited_by: user.email,
          last_edited_at: new Date().toISOString()
        })
        .eq('id', meetingId)

      if (error) throw error
      toast({ title: 'Status updated', className: 'border-[#10b981] text-[#10b981]', duration: 2000 })
      return true
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error updating meeting status:', error)
      toast({ title: 'Error', description: getSafeErrorMessage(error), variant: 'destructive', duration: 3000 })
      return false
    } finally {
      setUpdating(null)
    }
  }

  const createRescheduleRow = async (meeting: {
    client_id: string
    contact_person: string
    company_name: string
    sdr_name: string
  }) => {
    try {
      setUpdating('reschedule')
      const user = await getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('sql_meetings')
        .insert({
          client_id: meeting.client_id,
          contact_person: meeting.contact_person,
          company_name: meeting.company_name,
          sdr_name: meeting.sdr_name,
          booking_date: new Date().toISOString().split('T')[0],
          meeting_status: 'pending',
          meeting_held: false,
          edited_in_dashboard: true,
          last_edited_by: user.email,
          last_edited_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      toast({ title: 'Reschedule created', className: 'border-[#10b981] text-[#10b981]', duration: 2000 })
      return data
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error creating reschedule row:', error)
      toast({ title: 'Error', description: getSafeErrorMessage(error), variant: 'destructive', duration: 3000 })
      return null
    } finally {
      setUpdating(null)
    }
  }

  const updateClientNotes = async (meetingId: string, newNotes: string) => {
    try {
      setUpdating(meetingId)
      const user = await getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('sql_meetings')
        .update({
          client_notes: newNotes,
          edited_in_dashboard: true,
          last_edited_by: user.email,
          last_edited_at: new Date().toISOString()
        })
        .eq('id', meetingId)

      if (error) throw error
      toast({ title: 'Notes saved', className: 'border-[#10b981] text-[#10b981]', duration: 2000 })
      return true
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error updating notes:', error)
      toast({ title: 'Error', description: getSafeErrorMessage(error), variant: 'destructive', duration: 3000 })
      return false
    } finally {
      setUpdating(null)
    }
  }

  return {
    updateMeetingHeld,
    updateMeetingStatus,
    updateClientNotes,
    createRescheduleRow,
    updating
  }
}
