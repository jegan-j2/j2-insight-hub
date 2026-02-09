import { createClient } from '@supabase/supabase-js'

// Supabase configuration
// NOTE: These are placeholder values - will be replaced with real credentials later
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Helper function to check if user is authenticated
export const isAuthenticated = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Helper function to get user role and client_id
export const getUserMetadata = async () => {
  const user = await getCurrentUser()
  if (!user) return null
  
  return {
    role: user.user_metadata?.role || 'client',
    clientId: user.user_metadata?.client_id,
    clientName: user.user_metadata?.client_name,
    email: user.email
  }
}
