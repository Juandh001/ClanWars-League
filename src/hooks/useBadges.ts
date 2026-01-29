import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Badge, BadgeWithSeason, BadgeCategory } from '../types/database'

export function useBadges(targetId: string | undefined, category?: BadgeCategory) {
  const [badges, setBadges] = useState<BadgeWithSeason[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBadges = useCallback(async () => {
    if (!targetId || !isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    setLoading(true)

    let query = supabase
      .from('badges')
      .select(`
        *,
        season:seasons(*)
      `)
      .eq('target_id', targetId)
      .order('awarded_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      setError(error.message)
    } else {
      // Transform data to match BadgeWithSeason type
      const badgesWithSeason: BadgeWithSeason[] = (data || []).map((badge: any) => ({
        ...badge,
        season: Array.isArray(badge.season) ? badge.season[0] : badge.season
      }))
      setBadges(badgesWithSeason)
    }
    setLoading(false)
  }, [targetId, category])

  useEffect(() => {
    fetchBadges()
  }, [fetchBadges])

  return { badges, loading, error, refetch: fetchBadges }
}

export function useAllBadges(category?: BadgeCategory) {
  const [badges, setBadges] = useState<BadgeWithSeason[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBadges = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    setLoading(true)

    let query = supabase
      .from('badges')
      .select(`
        *,
        season:seasons(*)
      `)
      .order('awarded_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      setError(error.message)
    } else {
      const badgesWithSeason: BadgeWithSeason[] = (data || []).map((badge: any) => ({
        ...badge,
        season: Array.isArray(badge.season) ? badge.season[0] : badge.season
      }))
      setBadges(badgesWithSeason)
    }
    setLoading(false)
  }, [category])

  useEffect(() => {
    fetchBadges()
  }, [fetchBadges])

  return { badges, loading, error, refetch: fetchBadges }
}

// Helper function to get badge color based on type
export function getBadgeColor(badgeType: string): string {
  switch (badgeType) {
    case 'gold':
      return 'text-yellow-400'
    case 'silver':
      return 'text-gray-300'
    case 'bronze':
      return 'text-orange-400'
    default:
      return 'text-gray-500'
  }
}

// Helper function to get badge background based on type
export function getBadgeBgColor(badgeType: string): string {
  switch (badgeType) {
    case 'gold':
      return 'bg-yellow-400/20'
    case 'silver':
      return 'bg-gray-300/20'
    case 'bronze':
      return 'bg-orange-400/20'
    default:
      return 'bg-gray-500/20'
  }
}
