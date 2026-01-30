import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Profile, ProfileWithClan, MatchWithClans, Clan, ClanMember } from '../types/database'

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

    const typedMemberData = memberData as (ClanMember & { clan: Clan | Clan[] }) | null
    const typedProfileData = profileData as Profile

    const profileWithClan: ProfileWithClan = {
      ...typedProfileData,
      clan_member: typedMemberData ? {
        ...typedMemberData,
        clan: Array.isArray(typedMemberData.clan) ? typedMemberData.clan[0] : typedMemberData.clan
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

    // Get matches where this specific player participated (not all clan matches)
    const { data: participationsData } = await supabase
      .from('match_participants')
      .select('match_id, team')
      .eq('user_id', userId)

    const typedParticipations = participationsData as { match_id: string; team: 'winner' | 'loser' }[] | null

    if (!typedParticipations || typedParticipations.length === 0) {
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

    // Get the match IDs where the player participated
    const matchIds = typedParticipations.map(p => p.match_id)

    // Get full match details for those matches
    const { data: matchesData } = await supabase
      .from('matches')
      .select(`
        *,
        winner_clan:clans!matches_winner_clan_id_fkey(*),
        loser_clan:clans!matches_loser_clan_id_fkey(*),
        reporter:profiles!matches_reported_by_fkey(*)
      `)
      .in('id', matchIds)
      .order('created_at', { ascending: false })

    if (matchesData) {
      const typedMatchesData = matchesData as Array<{
        id: string
        winner_clan_id: string
        loser_clan_id: string
        reported_by: string
        winner_score: number
        loser_score: number
        points_awarded: number
        power_win: boolean
        power_points_bonus: number
        match_mode: string
        notes: string | null
        created_at: string
        season_id: string | null
        winner_clan: Clan | Clan[]
        loser_clan: Clan | Clan[]
        reporter: Profile | Profile[]
      }>

      const formattedMatches = typedMatchesData.map(match => ({
        ...match,
        winner_clan: Array.isArray(match.winner_clan) ? match.winner_clan[0] : match.winner_clan,
        loser_clan: Array.isArray(match.loser_clan) ? match.loser_clan[0] : match.loser_clan,
        reporter: Array.isArray(match.reporter) ? match.reporter[0] : match.reporter
      })) as MatchWithClans[]

      setMatches(formattedMatches)

      // Calculate wins/losses based on the player's team in each match
      const participationMap = new Map(typedParticipations.map(p => [p.match_id, p.team]))
      const wins = formattedMatches.filter(m => participationMap.get(m.id) === 'winner').length
      const losses = formattedMatches.filter(m => participationMap.get(m.id) === 'loser').length

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

  // Use a ref for the channel to ensure proper cleanup
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Subscribe to realtime presence changes
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    // Create unique channel name to avoid conflicts
    const channelName = `online_users_${Date.now()}_${Math.random().toString(36).slice(2)}`

    channelRef.current = supabase
      .channel(channelName)
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
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [fetchOnlineUsers])

  return { onlineUsers, loading, refetch: fetchOnlineUsers }
}
