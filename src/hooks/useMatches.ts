import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { MatchWithClans, Clan, MatchMode, Profile } from '../types/database'
import { useAuth } from '../contexts/AuthContext'

// =============================================================================
// POINTS CONFIGURATION - New Skill-Based System
// =============================================================================

const BASE_POINTS_WIN = 100 // Base points for winning
const LOSS_PENALTY_PERCENT = 0.30 // Loser loses 30% of what winner gains
const MAX_BONUS_PERCENT = 0.60 // Maximum bonus: 60% of base points
const MAX_RANK_DIFF = 50 // Maximum rank difference for bonus calculation

// Match mode helpers
export const MATCH_MODES: MatchMode[] = ['1v1', '2v2', '3v3', '4v4', '5v5', '6v6']

export function getPlayersPerTeam(mode: MatchMode): number {
  return parseInt(mode.charAt(0))
}

// =============================================================================
// RANKING HELPER FUNCTIONS
// =============================================================================

// Get all clans ordered by points (returns position/rank for each clan)
export async function getClanRankings(): Promise<Map<string, number>> {
  const rankMap = new Map<string, number>()

  if (!isSupabaseConfigured()) return rankMap

  const { data } = await supabase
    .from('clans')
    .select('id')
    .order('points', { ascending: false })
    .order('matches_won', { ascending: false })

  if (data) {
    (data as { id: string }[]).forEach((clan, index) => {
      rankMap.set(clan.id, index + 1) // Rank starts at 1
    })
  }

  return rankMap
}

// Get all warriors ordered by points (returns position/rank for each warrior)
export async function getWarriorRankings(): Promise<Map<string, number>> {
  const rankMap = new Map<string, number>()

  if (!isSupabaseConfigured()) return rankMap

  // Get all clan members
  const { data: membersData } = await supabase
    .from('clan_members')
    .select('user_id')

  if (!membersData || membersData.length === 0) return rankMap

  const warriorIds = (membersData as { user_id: string }[]).map(m => m.user_id)

  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, warrior_points')
    .in('id', warriorIds)
    .order('warrior_points', { ascending: false })

  if (profilesData) {
    (profilesData as { id: string; warrior_points: number }[]).forEach((profile, index) => {
      rankMap.set(profile.id, index + 1) // Rank starts at 1
    })
  }

  return rankMap
}

// Get clan members' IDs for a specific clan
export async function getClanMemberIds(clanId: string): Promise<string[]> {
  if (!isSupabaseConfigured()) return []

  const { data } = await supabase
    .from('clan_members')
    .select('user_id')
    .eq('clan_id', clanId)

  return (data as { user_id: string }[] | null)?.map(m => m.user_id) || []
}

// Calculate average warrior rank for a clan's members
export async function getAverageWarriorRankForClan(
  clanId: string,
  warriorRankings: Map<string, number>
): Promise<number> {
  const memberIds = await getClanMemberIds(clanId)

  if (memberIds.length === 0) return 999 // No members = worst rank

  const ranks = memberIds
    .map(id => warriorRankings.get(id))
    .filter((r): r is number => r !== undefined)

  if (ranks.length === 0) return 999

  return ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length
}

// =============================================================================
// CALCULATED RANK LOGIC
// =============================================================================

/**
 * Calculate the "Calculated Rank" for the opponent.
 *
 * Rule: If the opponent's clan rank is better (lower number) than
 * the average rank of their players, we average both values.
 *
 * This prevents clans with high-ranked position but low-skill players
 * from being unfairly easy targets.
 */
export function calculateCalculatedRank(
  clanRank: number,
  avgPlayerRank: number
): number {
  // If clan rank is better (lower) than average player rank, average them
  if (clanRank < avgPlayerRank) {
    return (clanRank + avgPlayerRank) / 2
  }
  // Otherwise, use the average player rank as-is
  return avgPlayerRank
}

// =============================================================================
// BONUS SKILL CALCULATION
// =============================================================================

/**
 * Calculate bonus skill points based on rank difference.
 *
 * Uses logarithmic formula for smooth scaling:
 * BonusSkill = BaseSkill × MaxBonusPct × ln(1 + ΔRank) / ln(1 + MaxRankDiff)
 *
 * @param yourRank - Your clan's rank position
 * @param opponentCalculatedRank - Opponent's calculated rank
 * @param basePoints - Base points for the win
 * @returns Bonus points (0 if opponent is lower ranked)
 */
export function calculateBonusSkill(
  yourRank: number,
  opponentCalculatedRank: number,
  basePoints: number
): number {
  // Only get bonus if beating a higher-ranked opponent (lower rank number)
  const rankDiff = yourRank - opponentCalculatedRank

  if (rankDiff <= 0) return 0 // No bonus for beating lower-ranked opponents

  // Logarithmic scaling factor
  const factor = Math.log(1 + rankDiff) / Math.log(1 + MAX_RANK_DIFF)

  // Calculate bonus (capped at MAX_BONUS_PERCENT of base)
  const bonus = basePoints * MAX_BONUS_PERCENT * Math.min(factor, 1)

  return Math.round(bonus)
}

// =============================================================================
// MAIN POINTS CALCULATION
// =============================================================================

export interface MatchPointsResult {
  winnerPoints: number
  loserPenalty: number
  basePoints: number
  bonusSkill: number
  winnerRank: number
  loserCalculatedRank: number
}

/**
 * Calculate match points using the new skill-based system.
 *
 * Winner gets: BasePoints + BonusSkill
 * Loser loses: 30% of what winner gains
 */
export async function calculateMatchPointsAdvanced(
  winnerClanId: string,
  loserClanId: string
): Promise<MatchPointsResult> {
  // Fetch current rankings
  const [clanRankings, warriorRankings] = await Promise.all([
    getClanRankings(),
    getWarriorRankings()
  ])

  // Get ranks for both clans
  const winnerClanRank = clanRankings.get(winnerClanId) || 999
  const loserClanRank = clanRankings.get(loserClanId) || 999

  // Calculate average warrior ranks for both clans
  const [winnerAvgWarriorRank, loserAvgWarriorRank] = await Promise.all([
    getAverageWarriorRankForClan(winnerClanId, warriorRankings),
    getAverageWarriorRankForClan(loserClanId, warriorRankings)
  ])

  // Calculate the "Calculated Rank" for the loser (opponent of winner)
  const loserCalculatedRank = calculateCalculatedRank(loserClanRank, loserAvgWarriorRank)

  // Winner's calculated rank (for display purposes)
  const winnerCalculatedRank = calculateCalculatedRank(winnerClanRank, winnerAvgWarriorRank)

  // Calculate bonus skill for winner
  const bonusSkill = calculateBonusSkill(winnerCalculatedRank, loserCalculatedRank, BASE_POINTS_WIN)

  // Total points for winner
  const winnerPoints = BASE_POINTS_WIN + bonusSkill

  // Penalty for loser (percentage of winner's gain)
  const loserPenalty = Math.round(winnerPoints * LOSS_PENALTY_PERCENT)

  return {
    winnerPoints,
    loserPenalty,
    basePoints: BASE_POINTS_WIN,
    bonusSkill,
    winnerRank: winnerCalculatedRank,
    loserCalculatedRank
  }
}

// Legacy function for backward compatibility
export function calculateMatchPoints(
  _matchMode: MatchMode,
  isWin: boolean
): { points: number; multiplier: number; basePoints: number } {
  return {
    points: isWin ? BASE_POINTS_WIN : 0,
    multiplier: 1,
    basePoints: isWin ? BASE_POINTS_WIN : 0
  }
}

// =============================================================================
// HOOKS
// =============================================================================

export function useMatches(clanId?: string, seasonId?: string | null) {
  const [matches, setMatches] = useState<MatchWithClans[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMatches = useCallback(async () => {
    // Skip fetching if seasonId is 'SKIP'
    if (seasonId === 'SKIP') {
      setLoading(false)
      return
    }

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

    // Filter by season if seasonId is provided
    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError.message)
    } else if (data) {
      const formattedMatches = (data as any[]).map(match => ({
        ...match,
        winner_clan: Array.isArray(match.winner_clan) ? match.winner_clan[0] : match.winner_clan,
        loser_clan: Array.isArray(match.loser_clan) ? match.loser_clan[0] : match.loser_clan,
        reporter: Array.isArray(match.reporter) ? match.reporter[0] : match.reporter
      })) as MatchWithClans[]
      setMatches(formattedMatches)
    }

    setLoading(false)
  }, [clanId, seasonId])

  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  return { matches, loading, error, refetch: fetchMatches }
}

// Hook to get clan members for roster selection
export function useClanMembers(clanId: string | null) {
  const [members, setMembers] = useState<(Profile & { clanRole: 'captain' | 'member' })[]>([])
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
        const formattedMembers = (data as any[]).map((m) => ({
          ...(Array.isArray(m.profile) ? m.profile[0] : m.profile),
          clanRole: m.role as 'captain' | 'member'
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

  // Report a loss - only the losing clan reports
  const reportLoss = async (
    winnerClanId: string,
    matchMode: MatchMode = '5v5',
    winnerParticipants: string[] = [],
    loserParticipants: string[] = [],
    notes?: string
  ) => {
    if (!user || !clan || !isSupabaseConfigured()) {
      return { error: new Error('Not authenticated or not in a clan') }
    }

    // Verify user is in a clan (the loser clan)
    const { data: membership } = await supabase
      .from('clan_members')
      .select('clan_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return { error: new Error('You are not in a clan') }
    }

    const loserClanId = (membership as { clan_id: string }).clan_id

    // Can't report against own clan
    if (winnerClanId === loserClanId) {
      return { error: new Error('Cannot report a match against your own clan') }
    }

    // Verify the winner clan exists
    const { data: winnerClan, error: winnerError } = await supabase
      .from('clans')
      .select('id, name, points')
      .eq('id', winnerClanId)
      .single()

    if (winnerError || !winnerClan) {
      return { error: new Error('Winner clan not found') }
    }

    setSubmitting(true)

    try {
      // Log the arrays being sent
      console.log('=== SENDING TO report_match ===')
      console.log('Winner participants:', winnerParticipants)
      console.log('Loser participants:', loserParticipants)
      console.log('Winner IDs count:', winnerParticipants.length)
      console.log('Loser IDs count:', loserParticipants.length)

      // Call the database function to report the match
      // This function runs with elevated privileges and bypasses RLS
      const { data: matchResult, error: rpcError } = await (supabase.rpc as any)('report_match', {
        p_winner_clan_id: winnerClanId,
        p_loser_clan_id: loserClanId,
        p_reported_by: user.id,
        p_winner_score: 1,
        p_loser_score: 0,
        p_match_mode: matchMode,
        p_notes: notes || null,
        p_winner_player_ids: winnerParticipants,
        p_loser_player_ids: loserParticipants
      })

      if (rpcError) {
        console.error('Error reporting match:', rpcError)
        setSubmitting(false)
        return { error: rpcError }
      }

      console.log('Match reported successfully:', matchResult)

      const result = matchResult as any

      setSubmitting(false)
      return {
        error: null,
        data: result,
        pointsAwarded: result?.points_awarded || 0,
        loserPenalty: 0, // Not returned by the function, can calculate if needed
        bonusSkill: result?.power_points_bonus || 0,
        winnerRank: 0, // Not returned by the function
        loserCalculatedRank: 0 // Not returned by the function
      }
    } catch (err) {
      console.error('Unexpected error reporting match:', err)
      setSubmitting(false)
      return { error: err as Error }
    }
  }

  // Admin function to report match with full control over both clans
  const reportMatchAsAdmin = async (
    winnerClanId: string,
    loserClanId: string,
    matchMode: MatchMode = '5v5',
    winnerParticipants: string[] = [],
    loserParticipants: string[] = [],
    notes?: string
  ) => {
    if (!user || !isSupabaseConfigured()) {
      return { error: new Error('Not authenticated') }
    }

    // Can't report against same clan
    if (winnerClanId === loserClanId) {
      return { error: new Error('Winner and loser clans must be different') }
    }

    // Verify both clans exist
    const { data: clans, error: clansError } = await supabase
      .from('clans')
      .select('id, name')
      .in('id', [winnerClanId, loserClanId])

    if (clansError || !clans || clans.length !== 2) {
      return { error: new Error('One or both clans not found') }
    }

    setSubmitting(true)

    try {
      console.log('=== ADMIN REPORTING MATCH ===')
      console.log('Winner clan:', winnerClanId)
      console.log('Loser clan:', loserClanId)
      console.log('Winner participants:', winnerParticipants)
      console.log('Loser participants:', loserParticipants)

      // Call the database function to report the match
      const { data: matchResult, error: rpcError } = await (supabase.rpc as any)('report_match', {
        p_winner_clan_id: winnerClanId,
        p_loser_clan_id: loserClanId,
        p_reported_by: user.id,
        p_winner_score: 1,
        p_loser_score: 0,
        p_match_mode: matchMode,
        p_notes: notes || null,
        p_winner_player_ids: winnerParticipants,
        p_loser_player_ids: loserParticipants
      })

      if (rpcError) {
        console.error('Error reporting match:', rpcError)
        setSubmitting(false)
        return { error: rpcError }
      }

      console.log('Match reported successfully:', matchResult)

      const result = matchResult as any

      setSubmitting(false)
      return {
        error: null,
        data: result,
        pointsAwarded: result?.points_awarded || 0,
        loserPenalty: 0,
        bonusSkill: result?.power_points_bonus || 0,
        winnerRank: 0,
        loserCalculatedRank: 0
      }
    } catch (err) {
      console.error('Unexpected error reporting match:', err)
      setSubmitting(false)
      return { error: err as Error }
    }
  }

  return { reportLoss, reportMatchAsAdmin, submitting }
}

export function useRankings(seasonId?: string | null) {
  const [rankings, setRankings] = useState<Clan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRankings = useCallback(async () => {
    // Skip fetching if seasonId is 'SKIP'
    if (seasonId === 'SKIP') {
      setLoading(false)
      return
    }

    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    setLoading(true)

    // If seasonId is provided, fetch from season_clan_stats
    if (seasonId) {
      const { data, error: fetchError } = await supabase
        .from('season_clan_stats')
        .select(`
          *,
          clan:clans(*)
        `)
        .eq('season_id', seasonId)
        .order('final_rank', { ascending: true })

      if (fetchError) {
        setError(fetchError.message)
      } else {
        // Map season stats to Clan format
        const mappedRankings = (data || []).map((stat: any) => ({
          ...stat.clan,
          points: stat.points,
          matches_played: stat.matches_played,
          matches_won: stat.matches_won,
          matches_lost: stat.matches_lost,
          max_win_streak: stat.max_win_streak,
          current_win_streak: 0,
          current_loss_streak: 0
        })) as Clan[]
        setRankings(mappedRankings)
      }
    } else {
      // Fetch current rankings from clans table
      const { data, error: fetchError } = await supabase
        .from('clans')
        .select('*')
        .order('points', { ascending: false })
        .order('matches_won', { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setRankings((data || []) as Clan[])
      }
    }

    setLoading(false)
  }, [seasonId])

  useEffect(() => {
    fetchRankings()
  }, [fetchRankings])

  // Use a ref for the channel to ensure proper cleanup
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Subscribe to realtime updates
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    // Create unique channel name to avoid conflicts
    const channelName = `rankings_changes_${Date.now()}_${Math.random().toString(36).slice(2)}`

    channelRef.current = supabase
      .channel(channelName)
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
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [fetchRankings])

  return { rankings, loading, error, refetch: fetchRankings }
}
