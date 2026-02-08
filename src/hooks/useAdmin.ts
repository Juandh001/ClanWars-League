import { useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Profile, Clan, AdminAction } from '../types/database'

export interface ClanDeletionInfo {
  clanName: string
  clanTag: string
  matchesCount: number
  affectedClansCount: number
  affectedWarriorsCount: number
  affectedWarriorNames: string[]
}

export function useAdmin() {
  const { user, isAdmin } = useAuth()
  const [loading, setLoading] = useState(false)

  const logAction = async (
    actionType: string,
    targetType: string,
    targetId: string,
    details?: Record<string, unknown>
  ) => {
    if (!user || !isSupabaseConfigured()) return

    await supabase.from('admin_actions').insert({
      admin_id: user.id,
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      details
    } as any)
  }

  // Delete a user/account
  const deleteUser = async (userId: string) => {
    if (!isAdmin || !isSupabaseConfigured()) {
      return { error: new Error('Unauthorized') }
    }

    setLoading(true)

    // Get user info for logging
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('nickname, email')
      .eq('id', userId)
      .single()

    // Remove from any clan first
    await supabase.from('clan_members').delete().eq('user_id', userId)

    // Delete profile
    const { error } = await supabase.from('profiles').delete().eq('id', userId)

    if (!error) {
      await logAction('delete_user', 'user', userId, {
        nickname: (userProfile as any)?.nickname,
        email: (userProfile as any)?.email
      })
    }

    setLoading(false)
    return { error }
  }

  // Get deletion impact info
  const getClanDeletionInfo = async (clanId: string): Promise<{ data: ClanDeletionInfo | null; error: Error | null }> => {
    if (!isAdmin || !isSupabaseConfigured()) {
      return { error: new Error('Unauthorized'), data: null }
    }

    // Get clan info
    const { data: clanData } = await supabase
      .from('clans')
      .select('name, tag')
      .eq('id', clanId)
      .single()

    // Get matches count and data
    const { data: matchesData, count: matchesCount } = await supabase
      .from('matches')
      .select('id, winner_clan_id, loser_clan_id', { count: 'exact' })
      .or(`winner_clan_id.eq.${clanId},loser_clan_id.eq.${clanId}`)

    const affectedClanIds = new Set<string>()
    const matchIds: string[] = []

    matchesData?.forEach((match: any) => {
      matchIds.push(match.id)
      if (match.winner_clan_id !== clanId) affectedClanIds.add(match.winner_clan_id)
      if (match.loser_clan_id !== clanId) affectedClanIds.add(match.loser_clan_id)
    })

    // Get unique warriors from the matches
    const { data: warriorsInMatches } = await supabase
      .from('match_participants')
      .select('user_id, profiles(nickname)')
      .in('match_id', matchIds)

    const affectedWarriorIds = new Set<string>()
    const affectedWarriorNames: string[] = []
    warriorsInMatches?.forEach((wp: any) => {
      if (!affectedWarriorIds.has(wp.user_id)) {
        affectedWarriorIds.add(wp.user_id)
        affectedWarriorNames.push(wp.profiles?.nickname || 'Unknown')
      }
    })

    return {
      data: {
        clanName: (clanData as any)?.name || '',
        clanTag: (clanData as any)?.tag || '',
        matchesCount: matchesCount || 0,
        affectedClansCount: affectedClanIds.size,
        affectedWarriorsCount: affectedWarriorIds.size,
        affectedWarriorNames: affectedWarriorNames.slice(0, 10)
      },
      error: null
    }
  }

  // Recalculate clan stats from matches
  const recalculateClanStats = async (clanId: string) => {
    // Get all matches for this clan
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .or(`winner_clan_id.eq.${clanId},loser_clan_id.eq.${clanId}`)
      .order('created_at', { ascending: true })

    if (!matches || matches.length === 0) {
      // Reset stats if no matches
      // @ts-ignore - Supabase type inference issue
      await (supabase
        .from('clans')
        .update({
          points: 0,
          matches_won: 0,
          matches_lost: 0,
          matches_played: 0,
          current_win_streak: 0,
          current_loss_streak: 0,
          max_win_streak: 0
        }) as any)
        .eq('id', clanId)
      return
    }

    let points = 0
    let wins = 0
    let losses = 0
    let currentWinStreak = 0
    let currentLossStreak = 0
    let maxWinStreak = 0
    let tempStreak = 0

    // Calculate stats from matches
    matches.forEach((match: any) => {
      const isWinner = match.winner_clan_id === clanId

      if (isWinner) {
        points += match.points_awarded || 0
        wins++
      } else {
        losses++
      }
    })

    // Calculate current streak (most recent matches)
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i] as any
      const isWinner = match.winner_clan_id === clanId

      if (isWinner) {
        if (currentLossStreak === 0) {
          currentWinStreak++
        } else {
          break
        }
      } else {
        if (currentWinStreak === 0) {
          currentLossStreak++
        } else {
          break
        }
      }
    }

    // Calculate max win streak
    matches.forEach((match: any) => {
      const isWinner = match.winner_clan_id === clanId

      if (isWinner) {
        tempStreak++
        if (tempStreak > maxWinStreak) {
          maxWinStreak = tempStreak
        }
      } else {
        tempStreak = 0
      }
    })

    // Update clan stats
    // @ts-ignore - Supabase type inference issue
    await (supabase
      .from('clans')
      .update({
        points,
        matches_won: wins,
        matches_lost: losses,
        matches_played: wins + losses,
        current_win_streak: currentWinStreak,
        current_loss_streak: currentLossStreak,
        max_win_streak: maxWinStreak
      }) as any)
      .eq('id', clanId)
  }

  // Recalculate warrior stats from match_participants
  const recalculateWarriorStats = async (userId: string) => {
    // Get all match participations
    const { data: participations } = await supabase
      .from('match_participants')
      .select(`
        *,
        match:matches(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (!participations || participations.length === 0) {
      // Reset stats if no participations
      // @ts-ignore - Supabase type inference issue
      await (supabase
        .from('profiles')
        .update({
          warrior_points: 0,
          warrior_wins: 0,
          warrior_losses: 0,
          current_win_streak: 0,
          current_loss_streak: 0,
          max_win_streak: 0
        }) as any)
        .eq('id', userId)
      return
    }

    let points = 0
    let wins = 0
    let losses = 0
    let currentWinStreak = 0
    let currentLossStreak = 0
    let maxWinStreak = 0
    let tempStreak = 0

    // Calculate stats
    participations.forEach((participation: any) => {
      const isWinner = participation.team === 'winner'
      const match = participation.match

      if (isWinner && match) {
        points += match.points_awarded || 0
        wins++
      } else if (match) {
        losses++
      }
    })

    // Calculate current streak (most recent)
    for (let i = participations.length - 1; i >= 0; i--) {
      const participation: any = participations[i]
      const isWinner = participation.team === 'winner'

      if (isWinner) {
        if (currentLossStreak === 0) {
          currentWinStreak++
        } else {
          break
        }
      } else {
        if (currentWinStreak === 0) {
          currentLossStreak++
        } else {
          break
        }
      }
    }

    // Calculate max win streak
    participations.forEach((participation: any) => {
      const isWinner = participation.team === 'winner'

      if (isWinner) {
        tempStreak++
        if (tempStreak > maxWinStreak) {
          maxWinStreak = tempStreak
        }
      } else {
        tempStreak = 0
      }
    })

    // Update warrior stats
    // @ts-ignore - Supabase type inference issue
    await (supabase
      .from('profiles')
      .update({
        warrior_points: points,
        warrior_wins: wins,
        warrior_losses: losses,
        current_win_streak: currentWinStreak,
        current_loss_streak: currentLossStreak,
        max_win_streak: maxWinStreak
      }) as any)
      .eq('id', userId)
  }

  // Delete a clan
  const deleteClan = async (clanId: string) => {
    if (!isAdmin || !isSupabaseConfigured()) {
      return { error: new Error('Unauthorized') }
    }

    setLoading(true)

    try {
      // Get clan info for logging
      const { data: clanData } = await supabase
        .from('clans')
        .select('name, tag')
        .eq('id', clanId)
        .single()

      // Get all matches to identify affected clans and warriors BEFORE deletion
      const { data: matchesData } = await supabase
        .from('matches')
        .select('id, winner_clan_id, loser_clan_id')
        .or(`winner_clan_id.eq.${clanId},loser_clan_id.eq.${clanId}`)

      // Get unique affected clan IDs (opponents)
      const affectedClanIds = new Set<string>()
      matchesData?.forEach((match: any) => {
        if (match.winner_clan_id !== clanId) affectedClanIds.add(match.winner_clan_id)
        if (match.loser_clan_id !== clanId) affectedClanIds.add(match.loser_clan_id)
      })

      // Get affected warriors BEFORE deletion
      const matchIds = matchesData?.map((m: any) => m.id) || []
      const { data: participantsData } = await supabase
        .from('match_participants')
        .select('user_id')
        .in('match_id', matchIds)

      const affectedWarriorIds = new Set<string>()
      participantsData?.forEach((p: any) => affectedWarriorIds.add(p.user_id))

      // Delete clan (CASCADE will automatically delete matches and match_participants)
      // No need to manually delete matches anymore - the CASCADE constraint handles it
      const { error: deleteError } = await supabase.from('clans').delete().eq('id', clanId)

      if (deleteError) {
        setLoading(false)
        return { error: deleteError }
      }

      // Recalculate points for affected clans
      for (const affectedClanId of affectedClanIds) {
        await recalculateClanStats(affectedClanId)
      }

      // Recalculate points for affected warriors
      for (const warriorId of affectedWarriorIds) {
        await recalculateWarriorStats(warriorId)
      }

      await logAction('delete_clan', 'clan', clanId, {
        name: (clanData as any)?.name,
        tag: (clanData as any)?.tag,
        matches_deleted: matchesData?.length || 0,
        affected_clans: affectedClanIds.size,
        affected_warriors: affectedWarriorIds.size
      })

      setLoading(false)
      return { error: null }
    } catch (error: any) {
      setLoading(false)
      return { error }
    }
  }

  // Remove player from clan
  const removePlayerFromClan = async (clanId: string, userId: string) => {
    if (!isAdmin || !isSupabaseConfigured()) {
      return { error: new Error('Unauthorized') }
    }

    setLoading(true)

    // Get info for logging
    const { data: memberData } = await supabase
      .from('clan_members')
      .select(`
        role,
        profile:profiles(nickname),
        clan:clans(name)
      `)
      .eq('clan_id', clanId)
      .eq('user_id', userId)
      .single()

    const { error } = await supabase
      .from('clan_members')
      .delete()
      .eq('clan_id', clanId)
      .eq('user_id', userId)

    if (!error) {
      await logAction('remove_from_clan', 'clan_member', `${clanId}:${userId}`, {
        clan_name: (memberData as any)?.clan?.name,
        player_nickname: (memberData as any)?.profile?.nickname
      })
    }

    setLoading(false)
    return { error }
  }

  // Adjust clan points
  const adjustClanPoints = async (
    clanId: string,
    pointsChange: number,
    reason: string
  ) => {
    if (!isAdmin || !isSupabaseConfigured()) {
      return { error: new Error('Unauthorized') }
    }

    setLoading(true)

    // Get current clan data
    const { data: clan, error: fetchError } = await supabase
      .from('clans')
      .select('points, name')
      .eq('id', clanId)
      .single()

    if (fetchError || !clan) {
      setLoading(false)
      return { error: fetchError || new Error('Clan not found') }
    }

    const newPoints = Math.max(0, (clan as any).points + pointsChange)

    // @ts-ignore - Supabase type inference issue
    const { error } = await (supabase
      .from('clans')
      .update({ points: newPoints }) as any)
      .eq('id', clanId)

    if (!error) {
      await logAction('adjust_points', 'clan', clanId, {
        clan_name: (clan as any).name,
        previous_points: (clan as any).points,
        new_points: newPoints,
        change: pointsChange,
        reason
      })
    }

    setLoading(false)
    return { error }
  }

  // Adjust warrior points
  const adjustWarriorPoints = async (
    userId: string,
    pointsChange: number,
    reason: string
  ) => {
    if (!isAdmin || !isSupabaseConfigured()) {
      return { error: new Error('Unauthorized') }
    }

    setLoading(true)

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('warrior_points, nickname')
      .eq('id', userId)
      .single()

    if (fetchError || !profile) {
      setLoading(false)
      return { error: fetchError || new Error('User not found') }
    }

    const newPoints = Math.max(0, ((profile as any).warrior_points || 0) + pointsChange)

    // @ts-ignore - Supabase type inference issue
    const { error } = await (supabase
      .from('profiles')
      .update({ warrior_points: newPoints }) as any)
      .eq('id', userId)

    if (!error) {
      await logAction('adjust_warrior_points', 'user', userId, {
        nickname: (profile as any).nickname,
        previous_points: (profile as any).warrior_points || 0,
        new_points: newPoints,
        change: pointsChange,
        reason
      })
    }

    setLoading(false)
    return { error }
  }

  // Make user admin
  const setUserRole = async (userId: string, role: 'user' | 'admin') => {
    if (!isAdmin || !isSupabaseConfigured()) {
      return { error: new Error('Unauthorized') }
    }

    setLoading(true)

    const { data: profile } = await supabase
      .from('profiles')
      .select('nickname, role')
      .eq('id', userId)
      .single()

    // @ts-ignore - Supabase type inference issue
    const { error } = await (supabase
      .from('profiles')
      .update({ role }) as any)
      .eq('id', userId)

    if (!error) {
      await logAction('change_user_role', 'user', userId, {
        nickname: (profile as any)?.nickname,
        previous_role: (profile as any)?.role,
        new_role: role
      })
    }

    setLoading(false)
    return { error }
  }

  return {
    loading,
    deleteUser,
    deleteClan,
    getClanDeletionInfo,
    removePlayerFromClan,
    adjustClanPoints,
    adjustWarriorPoints,
    setUserRole
  }
}

export function useAdminData() {
  const { isAdmin } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [clans, setClans] = useState<Clan[]>([])
  const [actions, setActions] = useState<(AdminAction & { admin: Profile })[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!isAdmin || !isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    setLoading(true)

    // Fetch all users
    const { data: usersData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    setUsers(usersData as any || [])

    // Fetch all clans with member count
    const { data: clansData } = await supabase
      .from('clans')
      .select(`
        *,
        clan_members(count)
      `)
      .order('points', { ascending: false })

    // Map clans to include member_count
    const clansWithCount = (clansData || []).map((clan: any) => ({
      ...clan,
      member_count: clan.clan_members?.[0]?.count || 0
    }))

    setClans(clansWithCount)

    // Fetch recent admin actions
    const { data: actionsData } = await supabase
      .from('admin_actions')
      .select(`
        *,
        admin:profiles!admin_actions_admin_id_fkey(*)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (actionsData) {
      setActions(
        actionsData.map((a: any) => ({
          ...a,
          admin: Array.isArray(a.admin) ? a.admin[0] : a.admin
        })) as (AdminAction & { admin: Profile })[]
      )
    }

    setLoading(false)
  }, [isAdmin])

  return { users, clans, actions, loading, refetch: fetchData }
}
