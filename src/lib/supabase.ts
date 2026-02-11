import { createClient } from '@supabase/supabase-js'

// Production Supabase configuration
const supabaseUrl = 'https://eaeqkgjhgdykxwjkaxpj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZXFrZ2poZ2R5a3h3amtheHBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MjI2NDUsImV4cCI6MjA4NjI5ODY0NX0.kA6Uh3mY_ZPE_HVwMvdbb61X-iU3XF7XIAKTUoDKm60'

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

// Helper function to get user role and client_id from user_roles table
export const getUserMetadata = async () => {
  const user = await getCurrentUser()
  if (!user) return null
  
  // Query user_roles table instead of user_metadata
  const { data, error } = await supabase
    .from('user_roles')
    .select('role, client_id')
    .eq('user_id', user.id)
    .single()
  
  if (error || !data) {
    console.error('Error fetching user role:', error)
    return null
  }
  
  return {
    role: data.role,
    clientId: data.client_id,
    email: user.email
  }
}
