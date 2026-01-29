import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Clan, ClanWithMembers, ClanMember, Profile, ClanInvitation } from '../types/database'
import { useAuth } from '../contexts/AuthContext'

export function useClans() {
  const [clans, setClans] = useState<Clan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClans = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('clans')
      .select('*')
      .order('points', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setClans(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchClans()
  }, [fetchClans])

  return { clans, loading, error, refetch: fetchClans }
}

export function useClan(clanId: string | undefined) {
  const [clan, setClan] = useState<ClanWithMembers | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClan = useCallback(async () => {
    if (!clanId || !isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    setLoading(true)

    // Fetch clan with captain
    const { data: clanData, error: clanError } = await supabase
      .from('clans')
      .select(`
        *,
        captain:profiles!clans_captain_id_fkey(*)
      `)
      .eq('id', clanId)
      .single()

    if (clanError) {
      setError(clanError.message)
      setLoading(false)
      return
    }

    // Fetch members with profiles
    const { data: membersData, error: membersError } = await supabase
      .from('clan_members')
      .select(`
        *,
        profile:profiles!clan_members_user_id_fkey(*)
      `)
      .eq('clan_id', clanId)

    if (membersError) {
      setError(membersError.message)
      setLoading(false)
      return
    }

    // Validate that members have profiles
    const validMembers = (membersData || []).filter(m => m.profile != null)

    const clanWithMembers: ClanWithMembers = {
      ...clanData,
      captain: Array.isArray(clanData.captain) ? clanData.captain[0] : clanData.captain,
      members: validMembers.map(m => ({
        ...m,
        profile: Array.isArray(m.profile) ? m.profile[0] : m.profile
      })) as (ClanMember & { profile: Profile })[]
    }

    setClan(clanWithMembers)
    setLoading(false)
  }, [clanId])

  useEffect(() => {
    fetchClan()
  }, [fetchClan])

  return { clan, loading, error, refetch: fetchClan }
}

// Search users by nickname for inviting
export function useUserSearch() {
  const [results, setResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)

  const searchUsers = async (query: string) => {
    if (!query || query.length < 2 || !isSupabaseConfigured()) {
      setResults([])
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname, email, is_online, last_seen')
      .ilike('nickname', `%${query}%`)
      .limit(10)

    if (!error && data) {
      setResults(data as Profile[])
    }

    setLoading(false)
  }

  return { results, loading, searchUsers, clearResults: () => setResults([]) }
}

export function useClanActions() {
  const { user, refreshProfile } = useAuth()

  const createClan = async (name: string, tag: string, description?: string, logo_url?: string) => {
    if (!user || !isSupabaseConfigured()) {
      return { error: new Error('Not authenticated'), data: null }
    }

    // Create clan
    const { data: clanData, error: clanError } = await supabase
      .from('clans')
      .insert({
        name,
        tag: tag.toUpperCase(),
        description,
        logo_url,
        captain_id: user.id,
        points: 0,
        power_wins: 0,
        matches_played: 0,
        matches_won: 0,
        matches_lost: 0
      })
      .select()
      .single()

    if (clanError) return { error: clanError, data: null }

    // Add creator as captain member
    const { error: memberError } = await supabase
      .from('clan_members')
      .insert({
        clan_id: clanData.id,
        user_id: user.id,
        role: 'captain'
      })

    if (memberError) return { error: memberError, data: null }

    await refreshProfile()
    return { error: null, data: clanData }
  }

  const updateClan = async (clanId: string, updates: { name?: string; description?: string; logo_url?: string }) => {
    if (!user || !isSupabaseConfigured()) {
      return { error: new Error('Not authenticated') }
    }

    const { error } = await supabase
      .from('clans')
      .update(updates)
      .eq('id', clanId)
      .eq('captain_id', user.id) // Ensure user is captain

    return { error }
  }

  // New: Invite by nickname (searches user and creates invitation)
  const inviteMemberByNickname = async (clanId: string, nickname: string) => {
    if (!user || !isSupabaseConfigured()) {
      return { error: new Error('Not authenticated') }
    }

    // Check if user is captain
    const { data: clanData } = await supabase
      .from('clans')
      .select('captain_id')
      .eq('id', clanId)
      .single()

    if (clanData?.captain_id !== user.id) {
      return { error: new Error('Only the captain can invite members') }
    }

    // Find user by nickname
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id, email, nickname')
      .ilike('nickname', nickname)
      .single()

    if (userError || !targetUser) {
      return { error: new Error(`User "${nickname}" not found`) }
    }

    // Check if target user is already in a clan
    const { data: existingMembership } = await supabase
      .from('clan_members')
      .select('clan_id')
      .eq('user_id', targetUser.id)
      .single()

    if (existingMembership) {
      return { error: new Error(`${targetUser.nickname} is already in a clan`) }
    }

    // Check clan member count
    const { count } = await supabase
      .from('clan_members')
      .select('*', { count: 'exact', head: true })
      .eq('clan_id', clanId)

    if (count && count >= 10) {
      return { error: new Error('Clan has reached maximum members (10)') }
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from('clan_invitations')
      .select('*')
      .eq('clan_id', clanId)
      .eq('user_id', targetUser.id)
      .eq('status', 'pending')
      .single()

    if (existingInvite) {
      return { error: new Error(`An invitation is already pending for ${targetUser.nickname}`) }
    }

    // Create invitation
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    const { error } = await supabase
      .from('clan_invitations')
      .insert({
        clan_id: clanId,
        user_id: targetUser.id,
        email: targetUser.email,
        invited_by: user.id,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      })

    return { error, invitedUser: targetUser }
  }

  // Legacy: Invite by email (kept for compatibility)
  const inviteMember = async (clanId: string, email: string) => {
    if (!user || !isSupabaseConfigured()) {
      return { error: new Error('Not authenticated') }
    }

    // Check if user is captain
    const { data: clanData } = await supabase
      .from('clans')
      .select('captain_id')
      .eq('id', clanId)
      .single()

    if (clanData?.captain_id !== user.id) {
      return { error: new Error('Only the captain can invite members') }
    }

    // Find user by email
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id, email, nickname')
      .eq('email', email.toLowerCase())
      .single()

    if (!targetUser) {
      return { error: new Error('No user found with that email. They must register first.') }
    }

    // Use the new invite by nickname function
    return inviteMemberByNickname(clanId, targetUser.nickname)
  }

  const acceptInvitation = async (invitationId: string) => {
    if (!user || !isSupabaseConfigured()) {
      return { error: new Error('Not authenticated') }
    }

    // Get invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('clan_invitations')
      .select('*')
      .eq('id', invitationId)
      .single()

    if (inviteError || !invitation) {
      return { error: new Error('Invitation not found') }
    }

    // Verify invitation is for this user
    if (invitation.user_id !== user.id) {
      // Fallback to email check for old invitations
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single()

      if (profile?.email.toLowerCase() !== invitation.email?.toLowerCase()) {
        return { error: new Error('This invitation is not for you') }
      }
    }

    // Check if user already in a clan
    const { data: existingMembership } = await supabase
      .from('clan_members')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (existingMembership) {
      return { error: new Error('You are already in a clan') }
    }

    // Check clan member count
    const { count } = await supabase
      .from('clan_members')
      .select('*', { count: 'exact', head: true })
      .eq('clan_id', invitation.clan_id)

    if (count && count >= 10) {
      return { error: new Error('Clan has reached maximum members (10)') }
    }

    // Add to clan
    const { error: memberError } = await supabase
      .from('clan_members')
      .insert({
        clan_id: invitation.clan_id,
        user_id: user.id,
        role: 'member'
      })

    if (memberError) return { error: memberError }

    // Update invitation status
    await supabase
      .from('clan_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId)

    await refreshProfile()
    return { error: null }
  }

  const declineInvitation = async (invitationId: string) => {
    if (!user || !isSupabaseConfigured()) {
      return { error: new Error('Not authenticated') }
    }

    // Get invitation to verify ownership
    const { data: invitation } = await supabase
      .from('clan_invitations')
      .select('user_id, email')
      .eq('id', invitationId)
      .single()

    if (!invitation) {
      return { error: new Error('Invitation not found') }
    }

    // Verify invitation is for this user
    if (invitation.user_id !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single()

      if (profile?.email.toLowerCase() !== invitation.email?.toLowerCase()) {
        return { error: new Error('This invitation is not for you') }
      }
    }

    // Update invitation status to rejected
    const { error } = await supabase
      .from('clan_invitations')
      .update({ status: 'rejected' })
      .eq('id', invitationId)

    return { error }
  }

  const kickMember = async (clanId: string, memberId: string) => {
    if (!user || !isSupabaseConfigured()) {
      return { error: new Error('Not authenticated') }
    }

    // Verify captain
    const { data: clan } = await supabase
      .from('clans')
      .select('captain_id')
      .eq('id', clanId)
      .single()

    if (clan?.captain_id !== user.id) {
      return { error: new Error('Only the captain can kick members') }
    }

    // Can't kick yourself (captain)
    if (memberId === user.id) {
      return { error: new Error('Cannot kick yourself. Transfer captaincy first.') }
    }

    // Check minimum members
    const { count } = await supabase
      .from('clan_members')
      .select('*', { count: 'exact', head: true })
      .eq('clan_id', clanId)

    if (count && count <= 5) {
      return { error: new Error('Clan must have at least 5 members') }
    }

    const { error } = await supabase
      .from('clan_members')
      .delete()
      .eq('clan_id', clanId)
      .eq('user_id', memberId)

    return { error }
  }

  const leaveClan = async (clanId: string) => {
    if (!user || !isSupabaseConfigured()) {
      return { error: new Error('Not authenticated') }
    }

    // Check if captain
    const { data: clan } = await supabase
      .from('clans')
      .select('captain_id')
      .eq('id', clanId)
      .single()

    if (clan?.captain_id === user.id) {
      return { error: new Error('Captain cannot leave. Transfer captaincy or disband the clan.') }
    }

    // Check minimum members
    const { count } = await supabase
      .from('clan_members')
      .select('*', { count: 'exact', head: true })
      .eq('clan_id', clanId)

    if (count && count <= 5) {
      return { error: new Error('Clan must have at least 5 members') }
    }

    const { error } = await supabase
      .from('clan_members')
      .delete()
      .eq('clan_id', clanId)
      .eq('user_id', user.id)

    if (!error) {
      await refreshProfile()
    }

    return { error }
  }

  return {
    createClan,
    updateClan,
    inviteMember,
    inviteMemberByNickname,
    acceptInvitation,
    declineInvitation,
    kickMember,
    leaveClan
  }
}

// Extended invitation type with clan and inviter info
export interface InvitationWithDetails extends ClanInvitation {
  clan: Clan
  inviter: Profile
}

export function usePendingInvitations() {
  const { user } = useAuth()
  const [invitations, setInvitations] = useState<InvitationWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  const fetchInvitations = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setInvitations([])
      setLoading(false)
      return
    }

    // Get user email for fallback
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    // Query invitations by user_id OR email (for backwards compatibility)
    let query = supabase
      .from('clan_invitations')
      .select(`
        *,
        clan:clans(*),
        inviter:profiles!clan_invitations_invited_by_fkey(*)
      `)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())

    // Add user filter
    if (profile?.email) {
      query = query.or(`user_id.eq.${user.id},email.eq.${profile.email.toLowerCase()}`)
    } else {
      query = query.eq('user_id', user.id)
    }

    const { data, error } = await query

    if (!error && data) {
      setInvitations(data.map(inv => ({
        ...inv,
        clan: Array.isArray(inv.clan) ? inv.clan[0] : inv.clan,
        inviter: Array.isArray(inv.inviter) ? inv.inviter[0] : inv.inviter
      })) as InvitationWithDetails[])
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  // Realtime subscription for new invitations
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return

    const channel = supabase
      .channel('invitation-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clan_invitations',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchInvitations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchInvitations])

  return { invitations, loading, refetch: fetchInvitations }
}
