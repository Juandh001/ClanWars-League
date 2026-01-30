import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Profile, Clan, ClanRole } from '../types/database'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  clan: (Clan & { role: 'captain' | 'member' }) | null
  loading: boolean
  isAdmin: boolean
  signUp: (email: string, password: string, nickname: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [clan, setClan] = useState<(Clan & { role: 'captain' | 'member' }) | null>(null)
  const [loading, setLoading] = useState(true)

  const isAdmin = profile?.role === 'admin'

  const fetchProfile = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured()) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }

    return data
  }, [])

  const fetchUserClan = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured()) return null

    const { data: memberData, error: memberError } = await supabase
      .from('clan_members')
      .select(`
        role,
        clan:clans!clan_members_clan_id_fkey(*)
      `)
      .eq('user_id', userId)
      .maybeSingle() as { data: { role: ClanRole; clan: Clan | Clan[] } | null; error: Error | null }

    if (memberError || !memberData?.clan) {
      return null
    }

    const clanData = Array.isArray(memberData.clan) ? memberData.clan[0] : memberData.clan
    return {
      ...clanData,
      role: memberData.role as 'captain' | 'member'
    }
  }, [])

  const updateOnlineStatus = useCallback(async (userId: string, isOnline: boolean) => {
    if (!isSupabaseConfigured()) return

    await supabase
      .from('profiles')
      .update({
        is_online: isOnline,
        last_seen: new Date().toISOString()
      })
      .eq('id', userId)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id)
      setProfile(profileData)
      const clanData = await fetchUserClan(user.id)
      setClan(clanData)
    }
  }, [user, fetchProfile, fetchUserClan])

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    let mounted = true
    let subscription: any = null

    // Get initial session and then listen for changes
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!mounted) return

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id)
          if (mounted) setProfile(profileData)

          const clanData = await fetchUserClan(session.user.id)
          if (mounted) setClan(clanData)

          updateOnlineStatus(session.user.id, true)
        }

        setLoading(false)

        // Now listen for auth changes
        const { data } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return

            setSession(session)
            setUser(session?.user ?? null)

            if (session?.user) {
              const profileData = await fetchProfile(session.user.id)
              if (mounted) setProfile(profileData)

              const clanData = await fetchUserClan(session.user.id)
              if (mounted) setClan(clanData)

              updateOnlineStatus(session.user.id, true)
            } else {
              setProfile(null)
              setClan(null)
            }
          }
        )

        subscription = data.subscription
      } catch (error) {
        console.error('Error initializing session:', error)
        if (mounted) setLoading(false)
      }
    }

    init()

    return () => {
      mounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [fetchProfile, fetchUserClan, updateOnlineStatus])

  // Update online status periodically (separate effect)
  useEffect(() => {
    if (!user) return

    const onlineInterval = setInterval(() => {
      updateOnlineStatus(user.id, true)
    }, 60000)

    const handleBeforeUnload = () => {
      updateOnlineStatus(user.id, false)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(onlineInterval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [user, updateOnlineStatus])

  const signUp = async (email: string, password: string, nickname: string) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Supabase not configured') }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) return { error }

    if (data.user) {
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          nickname,
          role: 'user',
          is_online: true
        })

      if (profileError) return { error: profileError }

      // Auto-login after successful registration
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) return { error: signInError }
    }

    return { error: null }
  }

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Supabase not configured') }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    return { error }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured()) return

    if (user) {
      await updateOnlineStatus(user.id, false)
    }
    await supabase.auth.signOut()
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!isSupabaseConfigured() || !user) {
      return { error: new Error('Not authenticated') }
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null)
    }

    return { error }
  }

  const value = {
    user,
    profile,
    session,
    clan,
    loading,
    isAdmin,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
