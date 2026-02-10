import { useState } from 'react'
import { supabase, getCurrentUser } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

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
      console.error('Error updating meeting status:', error)
      toast({
        title: 'Error',
        description: 'Failed to update meeting status',
        variant: 'destructive',
        duration: 3000
      })
      return false
    } finally {
      setUpdating(null)
    }
  }

  const updateRemarks = async (meetingId: string, newRemarks: string) => {
    try {
      setUpdating(meetingId)

      const user = await getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('sql_meetings')
        .update({
          remarks: newRemarks,
          edited_in_dashboard: true,
          last_edited_by: user.email,
          last_edited_at: new Date().toISOString()
        })
        .eq('id', meetingId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Remarks saved',
        duration: 2000
      })

      return true
    } catch (error) {
      console.error('Error updating remarks:', error)
      toast({
        title: 'Error',
        description: 'Failed to save remarks',
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
    updateRemarks,
    updating
  }
}
