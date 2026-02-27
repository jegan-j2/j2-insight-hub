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

      toast({
        title: 'Success',
        description: 'Meeting status updated',
        duration: 2000
      })

      return true
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error updating meeting status:', error)
      toast({
        title: 'Error',
        description: getSafeErrorMessage(error),
        variant: 'destructive',
        duration: 3000
      })
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
        .from('activity_log')
        .update({
          meeting_status: status
        })
        .eq('id', meetingId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Meeting status updated',
        duration: 2000
      })

      return true
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error updating meeting status:', error)
      toast({
        title: 'Error',
        description: getSafeErrorMessage(error),
        variant: 'destructive',
        duration: 3000
      })
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
    booking_date: string
  }) => {
    try {
      setUpdating('reschedule')

      const user = await getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('activity_log')
        .insert({
          client_id: meeting.client_id,
          contact_name: meeting.contact_person,
          company_name: meeting.company_name,
          sdr_name: meeting.sdr_name,
          activity_date: new Date().toISOString(),
          meeting_status: 'pending',
          activity_type: 'reschedule',
          is_sql: true
        })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Reschedule row created',
        duration: 2000
      })

      return true
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error creating reschedule row:', error)
      toast({
        title: 'Error',
        description: getSafeErrorMessage(error),
        variant: 'destructive',
        duration: 3000
      })
      return false
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
        .from('activity_log')
        .update({
          client_notes: newNotes
        })
        .eq('id', meetingId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Notes saved',
        duration: 2000
      })

      return true
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error updating notes:', error)
      toast({
        title: 'Error',
        description: getSafeErrorMessage(error),
        variant: 'destructive',
        duration: 3000
      })
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
