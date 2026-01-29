import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Crown,
  Medal,
  Award,
  Search,
  Zap,
  Swords,
  TrendingUp
} from 'lucide-react'
import { useWarriorRankings } from '../hooks/useWarriorRankings'
import { useSeasons } from '../hooks/useSeasons'
import { useBadges } from '../hooks/useBadges'
import { LoadingScreen } from '../components/ui/LoadingSpinner'
import { SeasonSelector, SeasonInfo } from '../components/ui/SeasonSelector'
import { StreakBadge } from '../components/ui/StreakIndicator'
import { InactivityCell } from '../components/ui/InactivityBadge'
import { BadgeDisplay } from '../components/ui/BadgeDisplay'
import { StatusIndicator } from '../components/ui/StatusIndicator'

export function WarriorRankingsPage() {
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const { seasons, loading: seasonsLoading } = useSeasons()
  const { warriors, loading: warriorsLoading, error } = useWarriorRankings(selectedSeasonId)

  const currentSeason = seasons.find(s => s.is_active)
  const selectedSeason = selectedSeasonId
    ? seasons.find(s => s.id === selectedSeasonId)
    : null

  // Filter warriors by search term
  const filteredWarriors = useMemo(() => {
    if (!searchTerm.trim()) return warriors

    const term = searchTerm.toLowerCase()
    return warriors.filter(w =>
      w.nickname.toLowerCase().includes(term) ||
      w.clan_tag?.toLowerCase().includes(term) ||
      w.clan_name?.toLowerCase().includes(term)
    )
  }, [warriors, searchTerm])

  // Calculate global stats
  const stats = useMemo(() => {
    return {
      totalWarriors: warriors.length,
      totalGames: warriors.reduce((sum, w) => sum + w.total_games, 0),
      totalPowerWins: warriors.reduce((sum, w) => sum + (w.warrior_power_wins || 0), 0)
    }
  }, [warriors])

  if (seasonsLoading || warriorsLoading) {
    return <LoadingScreen message="Loading warrior rankings..." />
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Swords className="w-8 h-8 text-accent-primary" />
            Warrior Rankings
          </h1>
          <SeasonInfo season={selectedSeason || currentSeason || null} className="mt-2" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search warriors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-primary w-full sm:w-64"
            />
          </div>

          {/* Season Filter */}
          <SeasonSelector
            seasons={seasons}
            selectedSeasonId={selectedSeasonId}
            onSelect={setSelectedSeasonId}
            showAllTime={false}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent-primary/20 rounded-xl">
              <Users className="w-6 h-6 text-accent-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold">{stats.totalWarriors}</p>
              <p className="text-gray-400 text-sm">Active Warriors</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent-success/20 rounded-xl">
              <TrendingUp className="w-6 h-6 text-accent-success" />
            </div>
            <div>
              <p className="text-3xl font-bold">{stats.totalGames}</p>
              <p className="text-gray-400 text-sm">Total Games</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent-warning/20 rounded-xl">
              <Zap className="w-6 h-6 text-accent-warning" />
            </div>
            <div>
              <p className="text-3xl font-bold">{stats.totalPowerWins}</p>
              <p className="text-gray-400 text-sm">Power Wins</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rankings Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-700/50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Rank</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Warrior</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Clan</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">PW</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">Streak</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">Inactive</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">Points</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">W-L</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">Games</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {filteredWarriors.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    {searchTerm ? 'No warriors found matching your search.' : 'No warriors have played yet this season.'}
                  </td>
                </tr>
              ) : (
                filteredWarriors.map((warrior, index) => (
                  <WarriorRow key={warrior.id} warrior={warrior} rank={index + 1} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="text-sm text-gray-500 flex flex-wrap gap-4">
        <span><strong>PW</strong> = Power Wins</span>
        <span><strong>W-L</strong> = Wins-Losses</span>
        <span><strong>Inactive</strong> = Days since last seen</span>
      </div>
    </div>
  )
}

interface WarriorRowProps {
  warrior: any
  rank: number
}

function WarriorRow({ warrior, rank }: WarriorRowProps) {
  const { badges } = useBadges(warrior.id, 'warrior')

  const getRankIcon = () => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />
    if (rank === 3) return <Award className="w-5 h-5 text-orange-400" />
    return <span className="text-gray-500 font-mono">{rank}</span>
  }

  const getRowBackground = () => {
    if (rank === 1) return 'bg-yellow-400/5'
    if (rank === 2) return 'bg-gray-300/5'
    if (rank === 3) return 'bg-orange-400/5'
    return ''
  }

  const winRate = warrior.total_games > 0
    ? ((warrior.warrior_wins / warrior.total_games) * 100).toFixed(0)
    : '0'

  return (
    <tr className={`hover:bg-dark-700/30 transition-colors ${getRowBackground()}`}>
      {/* Rank */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-center w-8 h-8">
          {getRankIcon()}
        </div>
      </td>

      {/* Warrior */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <StatusIndicator
            isOnline={warrior.is_online}
            lastSeen={warrior.last_seen}
            size="sm"
          />
          <div className="w-10 h-10 rounded-lg bg-dark-600 flex items-center justify-center font-bold overflow-hidden">
            {warrior.avatar_url ? (
              <img src={warrior.avatar_url} alt={warrior.nickname} className="w-full h-full object-cover" />
            ) : (
              warrior.nickname.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <Link
              to={`/player/${warrior.id}`}
              className="font-semibold hover:text-accent-primary transition-colors flex items-center gap-2"
            >
              {warrior.nickname}
              {badges.length > 0 && (
                <BadgeDisplay badges={badges} size="sm" maxDisplay={3} />
              )}
            </Link>
            <p className="text-xs text-gray-500">{winRate}% Win Rate</p>
          </div>
        </div>
      </td>

      {/* Clan */}
      <td className="px-4 py-3">
        {warrior.clan ? (
          <Link
            to={`/clan/${warrior.clan.id}`}
            className="text-accent-primary hover:underline"
          >
            [{warrior.clan_tag}]
          </Link>
        ) : (
          <span className="text-gray-500">-</span>
        )}
      </td>

      {/* Power Wins */}
      <td className="px-4 py-3 text-center">
        <span className="flex items-center justify-center gap-1 text-accent-warning">
          <Zap className="w-4 h-4" />
          {warrior.warrior_power_wins || 0}
        </span>
      </td>

      {/* Streak */}
      <td className="px-4 py-3 text-center">
        <StreakBadge
          winStreak={warrior.current_win_streak || 0}
          lossStreak={warrior.current_loss_streak || 0}
        />
      </td>

      {/* Inactive Days */}
      <td className="px-4 py-3 text-center">
        <InactivityCell lastSeen={warrior.last_seen} />
      </td>

      {/* Points */}
      <td className="px-4 py-3 text-center">
        <span className="font-bold text-accent-primary">{warrior.warrior_points || 0}</span>
      </td>

      {/* W-L */}
      <td className="px-4 py-3 text-center">
        <span className="text-accent-success">{warrior.warrior_wins || 0}</span>
        <span className="text-gray-500">-</span>
        <span className="text-accent-danger">{warrior.warrior_losses || 0}</span>
      </td>

      {/* Games */}
      <td className="px-4 py-3 text-center text-gray-400">
        {warrior.total_games}
      </td>
    </tr>
  )
}
