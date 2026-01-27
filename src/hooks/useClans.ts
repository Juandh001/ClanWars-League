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
        profile:profiles(*)
      `)
      .eq('clan_id', clanId)

    if (membersError) {
      setError(membersError.message)
      setLoading(false)
      return
    }

    const clanWithMembers: ClanWithMembers = {
      ...clanData,
      captain: Array.isArray(clanData.captain) ? clanData.captain[0] : clanData.captain,
      members: membersData.map(m => ({
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

export function useClanActions() {
  const { user, refreshProfile } = useAuth()

  const createClan = async (name: string, tag: string, description?: string) => {
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
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .single()

    if (existingInvite) {
      return { error: new Error('An invitation is already pending for this email') }
    }

    // Create invitation
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    const { error } = await supabase
      .from('clan_invitations')
      .insert({
        clan_id: clanId,
        email: email.toLowerCase(),
        invited_by: user.id,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      })

    return { error }
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

    // Verify email matches
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    if (profile?.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return { error: new Error('This invitation is not for your email') }
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
    inviteMember,
    acceptInvitation,
    kickMember,
    leaveClan
  }
}

export function usePendingInvitations() {
  const { user } = useAuth()
  const [invitations, setInvitations] = useState<(ClanInvitation & { clan: Clan })[]>([])
  const [loading, setLoading] = useState(true)

  const fetchInvitations = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    // Get user email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    if (!profile) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('clan_invitations')
      .select(`
        *,
        clan:clans(*)
      `)
      .eq('email', profile.email.toLowerCase())
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())

    if (!error && data) {
      setInvitations(data.map(inv => ({
        ...inv,
        clan: Array.isArray(inv.clan) ? inv.clan[0] : inv.clan
      })) as (ClanInvitation & { clan: Clan })[])
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  return { invitations, loading, refetch: fetchInvitations }
}
