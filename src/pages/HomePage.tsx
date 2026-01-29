import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Zap, TrendingUp, Crown, Medal, Award, Users, Flame } from 'lucide-react'
import { useRankings } from '../hooks/useMatches'
import { useSeasons, useCurrentSeason } from '../hooks/useSeasons'
import { useBadges } from '../hooks/useBadges'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { SeasonSelector, SeasonInfo } from '../components/ui/SeasonSelector'
import { StreakBadge } from '../components/ui/StreakIndicator'
import { BadgeDisplay } from '../components/ui/BadgeDisplay'

export function HomePage() {
  const { rankings, loading } = useRankings()
  const { seasons } = useSeasons()
  const { season: currentSeason } = useCurrentSeason()
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null)

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-bold">
            <span className="gradient-text">Clan Rankings</span>
          </h1>
          <SeasonInfo season={currentSeason} className="mt-2" />
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6 flex items-center gap-4">
          <div className="p-3 bg-accent-primary/20 rounded-xl">
            <Users className="w-6 h-6 text-accent-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{rankings.length}</p>
            <p className="text-gray-400 text-sm">Active Clans</p>
          </div>
        </div>

        <div className="card p-6 flex items-center gap-4">
          <div className="p-3 bg-accent-success/20 rounded-xl">
            <Trophy className="w-6 h-6 text-accent-success" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {rankings.reduce((acc, c) => acc + c.matches_played, 0)}
            </p>
            <p className="text-gray-400 text-sm">Matches Played</p>
          </div>
        </div>

        <div className="card p-6 flex items-center gap-4">
          <div className="p-3 bg-accent-warning/20 rounded-xl">
            <Zap className="w-6 h-6 text-accent-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {rankings.reduce((acc, c) => acc + c.power_wins, 0)}
            </p>
            <p className="text-gray-400 text-sm">Power Wins</p>
          </div>
        </div>
      </div>

      {/* Rankings Table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-dark-600">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent-primary" />
              League Standings
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <TrendingUp className="w-4 h-4" />
              Live Rankings
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : rankings.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No clans registered yet. Be the first to join!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-700/50">
                <tr>
                  <th className="table-header w-16">Rank</th>
                  <th className="table-header">Clan</th>
                  <th className="table-header text-center">
                    <span className="flex items-center justify-center gap-1">
                      <Flame className="w-4 h-4 text-orange-400" />
                      Streak
                    </span>
                  </th>
                  <th className="table-header text-center">PJ</th>
                  <th className="table-header text-center">PG</th>
                  <th className="table-header text-center">PP</th>
                  <th className="table-header text-center">
                    <span className="flex items-center justify-center gap-1">
                      <Zap className="w-4 h-4 text-accent-warning" />
                      PW
                    </span>
                  </th>
                  <th className="table-header text-center">Points</th>
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

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="font-semibold">Streak</span> = Win/Loss Streak
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">PJ</span> = Played
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-accent-success">PG</span> = Won
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-accent-danger">PP</span> = Lost
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent-warning" />
          <span className="font-semibold">PW</span> = Power Wins
        </div>
      </div>
    </div>
  )
}

// Separate component for clan row to use hooks
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
          className="flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-lg">
            <span className="text-sm font-bold">{clan.tag}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white group-hover:text-accent-primary transition-colors">
                {clan.name}
              </p>
              {badges.length > 0 && (
                <BadgeDisplay badges={badges} size="sm" maxDisplay={3} />
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
      <td className="table-cell text-center text-gray-400">
        {clan.matches_played}
      </td>
      <td className="table-cell text-center text-accent-success font-medium">
        {clan.matches_won}
      </td>
      <td className="table-cell text-center text-accent-danger font-medium">
        {clan.matches_lost}
      </td>
      <td className="table-cell text-center">
        <span className="flex items-center justify-center gap-1 text-accent-warning font-medium">
          <Zap className="w-3 h-3" />
          {clan.power_wins}
        </span>
      </td>
      <td className="table-cell text-center">
        <span className="px-3 py-1 bg-accent-primary/20 text-accent-primary font-bold rounded-full">
          {clan.points}
        </span>
      </td>
    </tr>
  )
}
