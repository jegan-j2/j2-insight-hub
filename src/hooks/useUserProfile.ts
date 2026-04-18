import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useUserRole } from './useUserRole'

export interface UserProfileState {
  email: string
  displayName: string  // full resolved name (e.g. "Jegan Ravichandran")
  firstName: string    // first word of displayName, capitalised
  initials: string     // 1-2 letter initials
  photoUrl: string | null
  loading: boolean
}

const CACHE_KEY = 'j2_user_profile_cache_v1'

const computeInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return '?'
}

const computeFirstName = (name: string): string => {
  const raw = name.trim().split(/[-_\s]/)[0]?.replace(/[^a-zA-Z]/g, '')?.trim()
  if (!raw) return ''
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
}

const buildState = (
  email: string,
  displayName: string,
  photoUrl: string | null,
  loading: boolean,
): UserProfileState => ({
  email,
  displayName,
  firstName: computeFirstName(displayName),
  initials: computeInitials(displayName || email || '?'),
  photoUrl,
  loading,
})

const readCache = (): { email: string; displayName: string; photoUrl: string | null } | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return {
        email: parsed.email ?? '',
        displayName: parsed.displayName ?? '',
        photoUrl: parsed.photoUrl ?? null,
      }
    }
  } catch { /* ignore */ }
  return null
}

const writeCache = (email: string, displayName: string, photoUrl: string | null) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ email, displayName, photoUrl })) } catch { /* ignore */ }
}

const resolveDisplayName = async (
  email: string,
  role: string | null,
  metadataName: string | null,
): Promise<{ displayName: string; photoUrl: string | null }> => {
  const r = role?.toLowerCase()

  // 1. Client → client_contacts.contact_name
  if (r === 'client') {
    const { data } = await supabase
      .from('client_contacts')
      .select('contact_name')
      .eq('email', email)
      .maybeSingle()
    if (data?.contact_name) return { displayName: data.contact_name, photoUrl: null }
  }

  // 2/3. SDR / Admin / Manager → team_members.sdr_name (+ photo)
  if (r === 'sdr' || r === 'admin' || r === 'manager') {
    const { data } = await supabase
      .from('team_members')
      .select('sdr_name, profile_photo_url')
      .eq('email', email)
      .maybeSingle()
    if (data?.sdr_name) return { displayName: data.sdr_name, photoUrl: data.profile_photo_url ?? null }
  }

  // Fallback: metadata full_name → email prefix
  if (metadataName) return { displayName: metadataName, photoUrl: null }
  const prefix = email.split('@')[0] ?? ''
  return { displayName: prefix, photoUrl: null }
}

export const useUserProfile = (): UserProfileState => {
  const { role, loading: roleLoading } = useUserRole()

  const [state, setState] = useState<UserProfileState>(() => {
    const cached = readCache()
    if (cached) return buildState(cached.email, cached.displayName, cached.photoUrl, false)
    return buildState('', '', null, true)
  })

  useEffect(() => {
    if (roleLoading) return
    let cancelled = false

    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        if (!cancelled) {
          try { localStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
          setState(buildState('', '', null, false))
        }
        return
      }
      const metadataName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        null

      const { displayName, photoUrl } = await resolveDisplayName(user.email, role, metadataName)
      if (cancelled) return
      writeCache(user.email, displayName, photoUrl)
      setState(buildState(user.email, displayName, photoUrl, false))
    }

    run()

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        try { localStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
        if (!cancelled) setState(buildState('', '', null, false))
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        run()
      }
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [role, roleLoading])

  return state
}
