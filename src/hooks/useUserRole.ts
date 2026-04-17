import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface UserRoleState {
  role: string | null
  clientId: string | null
  isAdmin: boolean
  isManager: boolean
  isClient: boolean
  isSdr: boolean
  loading: boolean
}

const CACHE_KEY = 'j2_user_role_cache_v1'

const buildState = (role: string | null, clientId: string | null, loading: boolean): UserRoleState => {
  const r = role?.toLowerCase() ?? null
  return {
    role,
    clientId,
    isAdmin: r === 'admin',
    isManager: r === 'manager',
    isClient: r === 'client',
    isSdr: r === 'sdr',
    loading,
  }
}

const readCache = (): { role: string | null; clientId: string | null } | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return { role: parsed.role ?? null, clientId: parsed.clientId ?? null }
    }
  } catch {
    /* ignore */
  }
  return null
}

const writeCache = (role: string | null, clientId: string | null) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ role, clientId }))
  } catch {
    /* ignore */
  }
}

export const useUserRole = (): UserRoleState => {
  const [state, setState] = useState<UserRoleState>(() => {
    const cached = readCache()
    if (cached) {
      // Treat cached value as authoritative for initial render to avoid UI flash;
      // it will be revalidated by the effect below.
      return buildState(cached.role, cached.clientId, false)
    }
    return buildState(null, null, true)
  })

  useEffect(() => {
    let cancelled = false
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          if (!cancelled) {
            writeCache(null, null)
            setState(buildState(null, null, false))
          }
          return
        }

        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role, client_id')
          .eq('user_id', user.id)
          .single()

        if (cancelled) return

        if (userRole) {
          writeCache(userRole.role, userRole.client_id)
          setState(buildState(userRole.role, userRole.client_id, false))
        } else {
          writeCache(null, null)
          setState(buildState(null, null, false))
        }
      } catch (error) {
        console.error('Error checking user role:', error)
        if (!cancelled) setState(prev => ({ ...prev, loading: false }))
      }
    }

    checkRole()

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        try { localStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
        if (!cancelled) setState(buildState(null, null, false))
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkRole()
      }
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  return state
}

export const usePermissions = () => {
  const { isAdmin, isManager, isClient, isSdr, clientId } = useUserRole()

  const canEditClients = isAdmin
  const canEditTeamMembers = isAdmin
  const canEditSettings = isAdmin
  const canViewOwnData = isSdr

  const canEditSQL = (sqlClientId?: string | null) => {
    if (isAdmin || isManager) return true
    if (isClient && sqlClientId === clientId) return true
    return false
  }

  return {
    canEditClients,
    canEditTeamMembers,
    canEditSettings,
    canEditSQL,
    canViewOwnData,
    isAdmin,
    isManager,
    isClient,
    isSdr,
  }
}
