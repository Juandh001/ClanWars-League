import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Helper para verificar si está configurado Supabase
export const isSupabaseConfigured = () => {
  return supabaseUrl !== '' && supabaseAnonKey !== ''
}

// Cleanup all realtime channels - call this on app init if needed
export const cleanupRealtimeChannels = async () => {
  const channels = supabase.getChannels()
  for (const channel of channels) {
    await supabase.removeChannel(channel)
  }
}
