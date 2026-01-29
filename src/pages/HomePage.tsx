import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Trophy,
  Zap,
  TrendingUp,
  Crown,
  Medal,
  Award,
  Users,
  Flame,
  Swords,
  Search
} from 'lucide-react'
import { useRankings } from '../hooks/useMatches'
import { useWarriorRankings } from '../hooks/useWarriorRankings'
import { useSeasons, useCurrentSeason } from '../hooks/useSeasons'
import { useBadges } from '../hooks/useBadges'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { SeasonSelector, SeasonInfo } from '../components/ui/SeasonSelector'
import { StreakBadge } from '../components/ui/StreakIndicator'
import { BadgeDisplay } from '../components/ui/BadgeDisplay'
import { StatusIndicator } from '../components/ui/StatusIndicator'

export function HomePage() {
  const { rankings, loading: clansLoading } = useRankings()
  const { warriors, loading: warriorsLoading } = useWarriorRankings()
  const { seasons } = useSeasons()
  const { season: currentSeason } = useCurrentSeason()
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

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

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />
    if (rank === 3) return <Award className="w-5 h-5 text-orange-400" />
    return <span className="text-gray-500">#{rank}</span>
  }

  const getRankRowClass = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/10 to-transparent border-l-4 border-yellow-500'
    if (rank === 2) return 'bg-gradient-to-r from-gray-400/10 to-transparent border-l-4 border-gray-400'
    if (rank === 3) return 'bg-gradient-to-r from-orange-500/10 to-transparent border-l-4 border-orange-500'
    return 'hover:bg-dark-700/50'
  }

  // Calculate global stats
  const stats = useMemo(() => ({
    totalClans: rankings.length,
    totalWarriors: warriors.length,
    totalMatches: rankings.reduce((acc, c) => acc + c.matches_played, 0),
    totalPowerWins: rankings.reduce((acc, c) => acc + c.power_wins, 0)
  }), [rankings, warriors])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-bold">
            <span className="gradient-text">League Rankings</span>
          </h1>
          <SeasonInfo season={currentSeason} className="mt-2" />
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
              className="pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-primary w-full sm:w-48"
            />
          </div>

          {seasons.length > 0 && (
            <SeasonSelector
              seasons={seasons}
              selectedSeasonId={selectedSeasonId}
              onSelect={setSelectedSeasonId}
              showAllTime={false}
            />
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 md:p-6 flex items-center gap-3">
          <div className="p-2 md:p-3 bg-accent-primary/20 rounded-xl">
            <Users className="w-5 h-5 md:w-6 md:h-6 text-accent-primary" />
          </div>
          <div>
            <p className="text-xl md:text-2xl font-bold">{stats.totalClans}</p>
            <p className="text-gray-400 text-xs md:text-sm">Clans</p>
          </div>
        </div>

        <div className="card p-4 md:p-6 flex items-center gap-3">
          <div className="p-2 md:p-3 bg-accent-secondary/20 rounded-xl">
            <Swords className="w-5 h-5 md:w-6 md:h-6 text-accent-secondary" />
          </div>
          <div>
            <p className="text-xl md:text-2xl font-bold">{stats.totalWarriors}</p>
            <p className="text-gray-400 text-xs md:text-sm">Warriors</p>
          </div>
        </div>

        <div className="card p-4 md:p-6 flex items-center gap-3">
          <div className="p-2 md:p-3 bg-accent-success/20 rounded-xl">
            <Trophy className="w-5 h-5 md:w-6 md:h-6 text-accent-success" />
          </div>
          <div>
            <p className="text-xl md:text-2xl font-bold">{stats.totalMatches}</p>
            <p className="text-gray-400 text-xs md:text-sm">Matches</p>
          </div>
        </div>

        <div className="card p-4 md:p-6 flex items-center gap-3">
          <div className="p-2 md:p-3 bg-accent-warning/20 rounded-xl">
            <Zap className="w-5 h-5 md:w-6 md:h-6 text-accent-warning" />
          </div>
          <div>
            <p className="text-xl md:text-2xl font-bold">{stats.totalPowerWins}</p>
            <p className="text-gray-400 text-xs md:text-sm">Power Wins</p>
          </div>
        </div>
      </div>

      {/* Two Tables Side by Side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Clan Rankings Table */}
        <div className="card overflow-hidden">
          <div className="p-4 md:p-6 border-b border-dark-600">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-display font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-accent-primary" />
                Clan Rankings
              </h2>
              <div className="flex items-center gap-2 text-xs md:text-sm text-gray-400">
                <TrendingUp className="w-4 h-4" />
                Live
              </div>
            </div>
          </div>

          {clansLoading ? (
            <div className="p-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : rankings.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No clans registered yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-700/50">
                  <tr>
                    <th className="table-header w-12">#</th>
                    <th className="table-header">Clan</th>
                    <th className="table-header text-center">
                      <Flame className="w-4 h-4 text-orange-400 mx-auto" />
                    </th>
                    <th className="table-header text-center">W-L</th>
                    <th className="table-header text-center">
                      <Zap className="w-4 h-4 text-accent-warning mx-auto" />
                    </th>
                    <th className="table-header text-center">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  {rankings.map((clan, index) => (
                    <ClanRankRow
                      key={clan.id}
                      clan={clan}
                      rank={index + 1}
                      getRankBadge={getRankBadge}
                      getRankRowClass={getRankRowClass}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Warrior Rankings Table */}
        <div className="card overflow-hidden">
          <div className="p-4 md:p-6 border-b border-dark-600">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-display font-bold flex items-center gap-2">
                <Swords className="w-5 h-5 text-accent-secondary" />
                Warrior Rankings
              </h2>
              <div className="flex items-center gap-2 text-xs md:text-sm text-gray-400">
                <TrendingUp className="w-4 h-4" />
                Live
              </div>
            </div>
          </div>

          {warriorsLoading ? (
            <div className="p-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredWarriors.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Swords className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{searchTerm ? 'No warriors found.' : 'No warriors have played yet.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-700/50">
                  <tr>
                    <th className="table-header w-12">#</th>
                    <th className="table-header">Warrior</th>
                    <th className="table-header text-center">
                      <Flame className="w-4 h-4 text-orange-400 mx-auto" />
                    </th>
                    <th className="table-header text-center">W-L</th>
                    <th className="table-header text-center">
                      <Zap className="w-4 h-4 text-accent-warning mx-auto" />
                    </th>
                    <th className="table-header text-center">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  {filteredWarriors.map((warrior, index) => (
                    <WarriorRankRow
                      key={warrior.id}
                      warrior={warrior}
                      rank={index + 1}
                      getRankBadge={getRankBadge}
                      getRankRowClass={getRankRowClass}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs md:text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          <span>Streak</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-accent-success">W</span>-<span className="text-accent-danger">L</span>
          <span>= Wins-Losses</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent-warning" />
          <span>Power Wins</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">Pts</span> = Points
        </div>
      </div>
    </div>
  )
}

// Clan Row Component
function ClanRankRow({
  clan,
  rank,
  getRankBadge,
  getRankRowClass
}: {
  clan: any
  rank: number
  getRankBadge: (rank: number) => React.ReactNode
  getRankRowClass: (rank: number) => string
}) {
  const { badges } = useBadges(clan.id, 'clan')

  return (
    <tr className={`transition-colors ${getRankRowClass(rank)}`}>
      <td className="table-cell">
        <div className="flex items-center justify-center">
          {getRankBadge(rank)}
        </div>
      </td>
      <td className="table-cell">
        <Link
          to={`/clan/${clan.id}`}
          className="flex items-center gap-2 group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0">
            {clan.logo_url ? (
              <img src={clan.logo_url} alt={clan.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold">{clan.tag}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="font-semibold text-white group-hover:text-accent-primary transition-colors text-sm truncate">
                {clan.name}
              </p>
              {badges.length > 0 && (
                <BadgeDisplay badges={badges} size="sm" maxDisplay={2} />
              )}
            </div>
            <p className="text-xs text-gray-500">[{clan.tag}]</p>
          </div>
        </Link>
      </td>
      <td className="table-cell text-center">
        <StreakBadge
          winStreak={clan.current_win_streak || 0}
          lossStreak={clan.current_loss_streak || 0}
        />
      </td>
      <td className="table-cell text-center text-sm">
        <span className="text-accent-success">{clan.matches_won}</span>
        <span className="text-gray-500">-</span>
        <span className="text-accent-danger">{clan.matches_lost}</span>
      </td>
      <td className="table-cell text-center">
        <span className="flex items-center justify-center gap-1 text-accent-warning text-sm">
          {clan.power_wins}
        </span>
      </td>
      <td className="table-cell text-center">
        <span className="px-2 py-0.5 bg-accent-primary/20 text-accent-primary font-bold rounded-full text-sm">
          {clan.points}
        </span>
      </td>
    </tr>
  )
}

// Warrior Row Component
function WarriorRankRow({
  warrior,
  rank,
  getRankBadge,
  getRankRowClass
}: {
  warrior: any
  rank: number
  getRankBadge: (rank: number) => React.ReactNode
  getRankRowClass: (rank: number) => string
}) {
  const { badges } = useBadges(warrior.id, 'warrior')

  return (
    <tr className={`transition-colors ${getRankRowClass(rank)}`}>
      <td className="table-cell">
        <div className="flex items-center justify-center">
          {getRankBadge(rank)}
        </div>
      </td>
      <td className="table-cell">
        <div className="flex items-center gap-2">
          <StatusIndicator
            isOnline={warrior.is_online}
            lastSeen={warrior.last_seen}
            size="sm"
          />
          <div className="w-8 h-8 rounded-lg bg-dark-600 flex items-center justify-center font-bold overflow-hidden flex-shrink-0">
            {warrior.avatar_url ? (
              <img src={warrior.avatar_url} alt={warrior.nickname} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs">{warrior.nickname.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <Link
              to={`/player/${warrior.id}`}
              className="font-semibold hover:text-accent-primary transition-colors flex items-center gap-1 text-sm"
            >
              <span className="truncate">{warrior.nickname}</span>
              {badges.length > 0 && (
                <BadgeDisplay badges={badges} size="sm" maxDisplay={2} />
              )}
            </Link>
            {warrior.clan_tag && (
              <Link
                to={`/clan/${warrior.clan?.id}`}
                className="text-xs text-accent-primary hover:underline"
              >
                [{warrior.clan_tag}]
              </Link>
            )}
          </div>
        </div>
      </td>
      <td className="table-cell text-center">
        <StreakBadge
          winStreak={warrior.current_win_streak || 0}
          lossStreak={warrior.current_loss_streak || 0}
        />
      </td>
      <td className="table-cell text-center text-sm">
        <span className="text-accent-success">{warrior.warrior_wins || 0}</span>
        <span className="text-gray-500">-</span>
        <span className="text-accent-danger">{warrior.warrior_losses || 0}</span>
      </td>
      <td className="table-cell text-center">
        <span className="flex items-center justify-center gap-1 text-accent-warning text-sm">
          {warrior.warrior_power_wins || 0}
        </span>
      </td>
      <td className="table-cell text-center">
        <span className="font-bold text-accent-primary text-sm">{warrior.warrior_points || 0}</span>
      </td>
    </tr>
  )
}
