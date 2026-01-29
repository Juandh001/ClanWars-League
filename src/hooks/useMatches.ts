import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Match, MatchWithClans, Clan, MatchMode, Profile } from '../types/database'
import { useAuth } from '../contexts/AuthContext'

// Points configuration
const POINTS_FOR_WIN = 3
const POWER_WIN_BONUS = 1 // Extra point for power win
const POWER_WIN_THRESHOLD = 5 // Score difference for power win
const RANKING_BONUS_DIVISOR = 10 // Points difference divided by this for bonus
const MAX_RANKING_BONUS = 5 // Maximum ranking-based bonus

// Match mode helpers
export const MATCH_MODES: MatchMode[] = ['1v1', '2v2', '3v3', '4v4', '5v5', '6v6']

export function getPlayersPerTeam(mode: MatchMode): number {
  return parseInt(mode.charAt(0))
}

// Calculate power points bonus based on ranking difference
export function calculatePowerPointsBonus(
  winnerPoints: number,
  loserPoints: number,
  scoreDifference: number
): { totalBonus: number; rankingBonus: number; scoreBonus: number; isPowerWin: boolean } {
  let rankingBonus = 0
  let scoreBonus = 0

  // Ranking-based bonus: If winner has fewer points than loser (giant killing)
  if (loserPoints > winnerPoints) {
    rankingBonus = Math.min(
      Math.floor((loserPoints - winnerPoints) / RANKING_BONUS_DIVISOR),
      MAX_RANKING_BONUS
    )
  }

  // Score difference bonus (power win)
  const isPowerWin = scoreDifference >= POWER_WIN_THRESHOLD
  if (isPowerWin) {
    scoreBonus = POWER_WIN_BONUS
  }

  return {
    totalBonus: rankingBonus + scoreBonus,
    rankingBonus,
    scoreBonus,
    isPowerWin
  }
}

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

// Hook to get clan members for roster selection
export function useClanMembers(clanId: string | null) {
  const [members, setMembers] = useState<(Profile & { role: string })[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clanId || !isSupabaseConfigured()) {
      setMembers([])
      return
    }

    const fetchMembers = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('clan_members')
        .select(`
          role,
          profile:profiles!clan_members_user_id_fkey(*)
        `)
        .eq('clan_id', clanId)

      if (!error && data) {
        const formattedMembers = data.map((m: any) => ({
          ...(Array.isArray(m.profile) ? m.profile[0] : m.profile),
          role: m.role
        }))
        setMembers(formattedMembers)
      }
      setLoading(false)
    }

    fetchMembers()
  }, [clanId])

  return { members, loading }
}

export function useReportMatch() {
  const { user, clan } = useAuth()
  const [submitting, setSubmitting] = useState(false)

  const reportLoss = async (
    winnerClanId: string,
    loserScore: number,
    winnerScore: number,
    matchMode: MatchMode = '5v5',
    winnerParticipants: string[] = [],
    loserParticipants: string[] = [],
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

    // Verify the winner clan exists and get their points for power points calculation
    const { data: winnerClan, error: winnerError } = await supabase
      .from('clans')
      .select('id, name, points')
      .eq('id', winnerClanId)
      .single()

    if (winnerError || !winnerClan) {
      return { error: new Error('Winner clan not found') }
    }

    // Get loser clan points
    const { data: loserClan } = await supabase
      .from('clans')
      .select('points')
      .eq('id', loserClanId)
      .single()

    // Can't report against own clan
    if (winnerClanId === loserClanId) {
      return { error: new Error('Cannot report a match against your own clan') }
    }

    setSubmitting(true)

    // Calculate power points
    const scoreDifference = winnerScore - loserScore
    const { totalBonus, isPowerWin } = calculatePowerPointsBonus(
      winnerClan.points,
      loserClan?.points || 0,
      scoreDifference
    )

    // Calculate total points awarded
    const pointsAwarded = POINTS_FOR_WIN + totalBonus

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
        power_points_bonus: totalBonus,
        match_mode: matchMode,
        notes
      })
      .select()
      .single()

    if (matchError) {
      setSubmitting(false)
      return { error: matchError }
    }

    // Insert match participants if provided
    if (matchData && (winnerParticipants.length > 0 || loserParticipants.length > 0)) {
      const participantsToInsert = [
        ...winnerParticipants.map(userId => ({
          match_id: matchData.id,
          user_id: userId,
          clan_id: winnerClanId,
          team: 'winner' as const
        })),
        ...loserParticipants.map(userId => ({
          match_id: matchData.id,
          user_id: userId,
          clan_id: loserClanId,
          team: 'loser' as const
        }))
      ]

      await supabase.from('match_participants').insert(participantsToInsert)
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
        .select('points, power_wins, matches_played, matches_won, current_win_streak, current_loss_streak, max_win_streak')
        .eq('id', winnerClanId)
        .single()

      if (currentWinner) {
        const newWinStreak = currentWinner.current_win_streak + 1
        await supabase
          .from('clans')
          .update({
            points: currentWinner.points + pointsAwarded,
            power_wins: currentWinner.power_wins + (isPowerWin ? 1 : 0),
            matches_played: currentWinner.matches_played + 1,
            matches_won: currentWinner.matches_won + 1,
            current_win_streak: newWinStreak,
            current_loss_streak: 0,
            max_win_streak: Math.max(currentWinner.max_win_streak, newWinStreak)
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
        .select('matches_played, matches_lost, current_win_streak, current_loss_streak')
        .eq('id', loserClanId)
        .single()

      if (currentLoser) {
        await supabase
          .from('clans')
          .update({
            matches_played: currentLoser.matches_played + 1,
            matches_lost: currentLoser.matches_lost + 1,
            current_win_streak: 0,
            current_loss_streak: currentLoser.current_loss_streak + 1
          })
          .eq('id', loserClanId)
      }
    }

    setSubmitting(false)
    return { error: null, data: matchData, isPowerWin, powerPointsBonus: totalBonus }
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
