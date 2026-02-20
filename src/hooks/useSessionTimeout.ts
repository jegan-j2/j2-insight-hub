import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export const useSessionTimeout = () => {
  const navigate = useNavigate()
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const warningRef = useRef<ReturnType<typeof setTimeout>>()
  const warningToastRef = useRef<string | number>()

  const TIMEOUT_DURATION = 30 * 60 * 1000 // 30 minutes
  const WARNING_BEFORE = 2 * 60 * 1000 // Warn 2 minutes before

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    toast.error('Session expired due to inactivity')
    navigate('/login')
  }, [navigate])

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    if (warningToastRef.current) toast.dismiss(warningToastRef.current)

    warningRef.current = setTimeout(() => {
      warningToastRef.current = toast.warning(
        'You will be logged out in 2 minutes due to inactivity',
        {
          duration: 120000,
          action: {
            label: 'Stay Logged In',
            onClick: () => {
              resetTimeout()
              toast.success('Session extended')
            },
          },
        }
      )
    }, TIMEOUT_DURATION - WARNING_BEFORE)

    timeoutRef.current = setTimeout(() => {
      logout()
    }, TIMEOUT_DURATION)
  }, [logout])

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

    events.forEach((event) => {
      window.addEventListener(event, resetTimeout, { passive: true })
    })

    resetTimeout()

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimeout)
      })
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningRef.current) clearTimeout(warningRef.current)
      if (warningToastRef.current) toast.dismiss(warningToastRef.current)
    }
  }, [resetTimeout])
}
