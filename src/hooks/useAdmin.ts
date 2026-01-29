import { useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Profile, Clan, AdminAction } from '../types/database'

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
    })
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
        nickname: userProfile?.nickname,
        email: userProfile?.email
      })
    }

    setLoading(false)
    return { error }
  }

  // Delete a clan
  const deleteClan = async (clanId: string) => {
    if (!isAdmin || !isSupabaseConfigured()) {
      return { error: new Error('Unauthorized') }
    }

    setLoading(true)

    // Get clan info for logging
    const { data: clanData } = await supabase
      .from('clans')
      .select('name, tag')
      .eq('id', clanId)
      .single()

    // Delete clan members
    await supabase.from('clan_members').delete().eq('clan_id', clanId)

    // Delete clan invitations
    await supabase.from('clan_invitations').delete().eq('clan_id', clanId)

    // Delete matches involving this clan
    await supabase
      .from('matches')
      .delete()
      .or(`winner_clan_id.eq.${clanId},loser_clan_id.eq.${clanId}`)

    // Delete clan
    const { error } = await supabase.from('clans').delete().eq('id', clanId)

    if (!error) {
      await logAction('delete_clan', 'clan', clanId, {
        name: clanData?.name,
        tag: clanData?.tag
      })
    }

    setLoading(false)
    return { error }
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
        clan_name: (memberData?.clan as any)?.name,
        player_nickname: (memberData?.profile as any)?.nickname
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

    const newPoints = Math.max(0, clan.points + pointsChange)

    const { error } = await supabase
      .from('clans')
      .update({ points: newPoints })
      .eq('id', clanId)

    if (!error) {
      await logAction('adjust_points', 'clan', clanId, {
        clan_name: clan.name,
        previous_points: clan.points,
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

    const newPoints = Math.max(0, (profile.warrior_points || 0) + pointsChange)

    const { error } = await supabase
      .from('profiles')
      .update({ warrior_points: newPoints })
      .eq('id', userId)

    if (!error) {
      await logAction('adjust_warrior_points', 'user', userId, {
        nickname: profile.nickname,
        previous_points: profile.warrior_points || 0,
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

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)

    if (!error) {
      await logAction('change_user_role', 'user', userId, {
        nickname: profile?.nickname,
        previous_role: profile?.role,
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

    setUsers(usersData || [])

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
        actionsData.map(a => ({
          ...a,
          admin: Array.isArray(a.admin) ? a.admin[0] : a.admin
        })) as (AdminAction & { admin: Profile })[]
      )
    }

    setLoading(false)
  }, [isAdmin])

  return { users, clans, actions, loading, refetch: fetchData }
}
