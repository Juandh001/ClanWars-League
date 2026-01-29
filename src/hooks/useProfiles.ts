import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Profile, ProfileWithClan, Match, MatchWithClans } from '../types/database'

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<ProfileWithClan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!userId || !isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    setLoading(true)

    // Fetch profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    // Fetch clan membership if any
    const { data: memberData } = await supabase
      .from('clan_members')
      .select(`
        *,
        clan:clans(*)
      `)
      .eq('user_id', userId)
      .single()

    const profileWithClan: ProfileWithClan = {
      ...profileData,
      clan_member: memberData ? {
        ...memberData,
        clan: Array.isArray(memberData.clan) ? memberData.clan[0] : memberData.clan
      } : undefined
    }

    setProfile(profileWithClan)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return { profile, loading, error, refetch: fetchProfile }
}

export function usePlayerStats(userId: string | undefined) {
  const [stats, setStats] = useState<{
    totalMatches: number
    wins: number
    losses: number
    clansHistory: { clan_id: string; clan_name: string; joined_at: string; left_at?: string }[]
  } | null>(null)
  const [matches, setMatches] = useState<MatchWithClans[]>([])
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!userId || !isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    setLoading(true)

    // Get user's current clan
    const { data: memberData } = await supabase
      .from('clan_members')
      .select('clan_id')
      .eq('user_id', userId)
      .single()

    if (!memberData) {
      setStats({
        totalMatches: 0,
        wins: 0,
        losses: 0,
        clansHistory: []
      })
      setMatches([])
      setLoading(false)
      return
    }

    // Get matches for user's clan
    const { data: matchesData } = await supabase
      .from('matches')
      .select(`
        *,
        winner_clan:clans!matches_winner_clan_id_fkey(*),
        loser_clan:clans!matches_loser_clan_id_fkey(*),
        reporter:profiles!matches_reported_by_fkey(*)
      `)
      .or(`winner_clan_id.eq.${memberData.clan_id},loser_clan_id.eq.${memberData.clan_id}`)
      .order('created_at', { ascending: false })

    if (matchesData) {
      const formattedMatches = matchesData.map(match => ({
        ...match,
        winner_clan: Array.isArray(match.winner_clan) ? match.winner_clan[0] : match.winner_clan,
        loser_clan: Array.isArray(match.loser_clan) ? match.loser_clan[0] : match.loser_clan,
        reporter: Array.isArray(match.reporter) ? match.reporter[0] : match.reporter
      })) as MatchWithClans[]

      setMatches(formattedMatches)

      const wins = formattedMatches.filter(m => m.winner_clan_id === memberData.clan_id).length
      const losses = formattedMatches.filter(m => m.loser_clan_id === memberData.clan_id).length

      setStats({
        totalMatches: wins + losses,
        wins,
        losses,
        clansHistory: [] // Could be expanded with clan history tracking
      })
    }

    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, matches, loading, refetch: fetchStats }
}

export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOnlineUsers = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    // Consider users online if they were seen in the last 5 minutes
    const fiveMinutesAgo = new Date()
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5)

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_online', true)
      .gte('last_seen', fiveMinutesAgo.toISOString())

    setOnlineUsers(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOnlineUsers()

    // Refresh every 30 seconds
    const interval = setInterval(fetchOnlineUsers, 30000)

    return () => clearInterval(interval)
  }, [fetchOnlineUsers])

  // Subscribe to realtime presence changes
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const channel = supabase
      .channel('online-users')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: 'is_online=eq.true'
        },
        () => {
          fetchOnlineUsers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchOnlineUsers])

  return { onlineUsers, loading, refetch: fetchOnlineUsers }
}
