import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface UserRoleState {
  role: string | null
  clientId: string | null
  isAdmin: boolean
  isManager: boolean
  isClient: boolean
  loading: boolean
}

export const useUserRole = (): UserRoleState => {
  const [state, setState] = useState<UserRoleState>({
    role: null,
    clientId: null,
    isAdmin: false,
    isManager: false,
    isClient: false,
    loading: true,
  })

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setState(prev => ({ ...prev, loading: false }))
          return
        }

        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role, client_id')
          .eq('user_id', user.id)
          .single()

        if (userRole) {
          setState({
            role: userRole.role,
            clientId: userRole.client_id,
            isAdmin: userRole.role === 'admin',
            isManager: userRole.role === 'manager',
            isClient: userRole.role === 'client',
            loading: false,
          })
        } else {
          setState(prev => ({ ...prev, loading: false }))
        }
      } catch (error) {
        console.error('Error checking user role:', error)
        setState(prev => ({ ...prev, loading: false }))
      }
    }

    checkRole()
  }, [])

  return state
}

export const usePermissions = () => {
  const { isAdmin, isManager, isClient, clientId } = useUserRole()

  const canEditClients = isAdmin
  const canEditTeamMembers = isAdmin
  const canEditSettings = isAdmin

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
    isAdmin,
    isManager,
    isClient,
  }
}
