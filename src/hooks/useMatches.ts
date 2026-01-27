import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Match, MatchWithClans, Clan } from '../types/database'
import { useAuth } from '../contexts/AuthContext'

// Points configuration
const POINTS_FOR_WIN = 3
const POWER_WIN_BONUS = 1 // Extra point for power win
const POWER_WIN_THRESHOLD = 5 // Score difference for power win (e.g., 10-5 or higher gap)

export function useMatches(clanId?: string) {
  const [matches, setMatches] = useState<MatchWithClans[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMatches = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    setLoading(true)

    let query = supabase
      .from('matches')
      .select(`
        *,
        winner_clan:clans!matches_winner_clan_id_fkey(*),
        loser_clan:clans!matches_loser_clan_id_fkey(*),
        reporter:profiles!matches_reported_by_fkey(*)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (clanId) {
      query = query.or(`winner_clan_id.eq.${clanId},loser_clan_id.eq.${clanId}`)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError.message)
    } else if (data) {
      const formattedMatches = data.map(match => ({
        ...match,
        winner_clan: Array.isArray(match.winner_clan) ? match.winner_clan[0] : match.winner_clan,
        loser_clan: Array.isArray(match.loser_clan) ? match.loser_clan[0] : match.loser_clan,
        reporter: Array.isArray(match.reporter) ? match.reporter[0] : match.reporter
      })) as MatchWithClans[]
      setMatches(formattedMatches)
    }

    setLoading(false)
  }, [clanId])

  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  return { matches, loading, error, refetch: fetchMatches }
}

export function useReportMatch() {
  const { user, clan } = useAuth()
  const [submitting, setSubmitting] = useState(false)

  const reportLoss = async (
    winnerClanId: string,
    loserScore: number,
    winnerScore: number,
    notes?: string
  ) => {
    if (!user || !clan || !isSupabaseConfigured()) {
      return { error: new Error('Not authenticated or not in a clan') }
    }

    // Verify user is in the losing clan (their own clan reports the loss)
    const { data: membership } = await supabase
      .from('clan_members')
      .select('clan_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return { error: new Error('You are not in a clan') }
    }

    const loserClanId = membership.clan_id

    // Verify the winner clan exists
    const { data: winnerClan, error: winnerError } = await supabase
      .from('clans')
      .select('id, name')
      .eq('id', winnerClanId)
      .single()

    if (winnerError || !winnerClan) {
      return { error: new Error('Winner clan not found') }
    }

    // Can't report against own clan
    if (winnerClanId === loserClanId) {
      return { error: new Error('Cannot report a match against your own clan') }
    }

    setSubmitting(true)

    // Determine if it's a power win (significant score difference)
    const scoreDifference = winnerScore - loserScore
    const isPowerWin = scoreDifference >= POWER_WIN_THRESHOLD

    // Calculate points awarded
    const pointsAwarded = POINTS_FOR_WIN + (isPowerWin ? POWER_WIN_BONUS : 0)

    // Create the match record
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .insert({
        winner_clan_id: winnerClanId,
        loser_clan_id: loserClanId,
        reported_by: user.id,
        winner_score: winnerScore,
        loser_score: loserScore,
        points_awarded: pointsAwarded,
        power_win: isPowerWin,
        notes
      })
      .select()
      .single()

    if (matchError) {
      setSubmitting(false)
      return { error: matchError }
    }

    // Update winner clan stats
    const { error: winnerUpdateError } = await supabase
      .rpc('update_clan_stats_win', {
        clan_id_param: winnerClanId,
        points_to_add: pointsAwarded,
        is_power_win: isPowerWin
      })

    if (winnerUpdateError) {
      // Fallback: manual update
      const { data: currentWinner } = await supabase
        .from('clans')
        .select('points, power_wins, matches_played, matches_won')
        .eq('id', winnerClanId)
        .single()

      if (currentWinner) {
        await supabase
          .from('clans')
          .update({
            points: currentWinner.points + pointsAwarded,
            power_wins: currentWinner.power_wins + (isPowerWin ? 1 : 0),
            matches_played: currentWinner.matches_played + 1,
            matches_won: currentWinner.matches_won + 1
          })
          .eq('id', winnerClanId)
      }
    }

    // Update loser clan stats
    const { error: loserUpdateError } = await supabase
      .rpc('update_clan_stats_loss', {
        clan_id_param: loserClanId
      })

    if (loserUpdateError) {
      // Fallback: manual update
      const { data: currentLoser } = await supabase
        .from('clans')
        .select('matches_played, matches_lost')
        .eq('id', loserClanId)
        .single()

      if (currentLoser) {
        await supabase
          .from('clans')
          .update({
            matches_played: currentLoser.matches_played + 1,
            matches_lost: currentLoser.matches_lost + 1
          })
          .eq('id', loserClanId)
      }
    }

    setSubmitting(false)
    return { error: null, data: matchData, isPowerWin }
  }

  return { reportLoss, submitting }
}

export function useRankings() {
  const [rankings, setRankings] = useState<Clan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRankings = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error: fetchError } = await supabase
      .from('clans')
      .select('*')
      .order('points', { ascending: false })
      .order('power_wins', { ascending: false })
      .order('matches_won', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setRankings(data || [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRankings()
  }, [fetchRankings])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const channel = supabase
      .channel('rankings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clans'
        },
        () => {
          fetchRankings()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchRankings])

  return { rankings, loading, error, refetch: fetchRankings }
}
