import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Users,
  Swords,
  Calendar,
  Star
} from 'lucide-react'
import { useHallOfFame, useSeasonChampions } from '../hooks/useHallOfFame'
import { useSeasons } from '../hooks/useSeasons'
import { LoadingScreen } from '../components/ui/LoadingSpinner'
import { SeasonSelector, SeasonBadge } from '../components/ui/SeasonSelector'
import { SingleBadge } from '../components/ui/BadgeDisplay'
import { format } from 'date-fns'

export function HallOfFamePage() {
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null)
  const { seasons, loading: seasonsLoading } = useSeasons()
  const { data: hallOfFameData, loading: hofLoading } = useHallOfFame()
  const { clanChampions, warriorChampions, loading: championsLoading } = useSeasonChampions(selectedSeasonId || undefined)

  const completedSeasons = seasons.filter(s => !s.is_active)
  const selectedSeason = selectedSeasonId ? seasons.find(s => s.id === selectedSeasonId) : null

  const loading = seasonsLoading || hofLoading || championsLoading

  if (loading) {
    return <LoadingScreen message="Loading Hall of Fame..." />
  }

  // If a specific season is selected, show that season's champions
  if (selectedSeasonId && selectedSeason) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-400" />
              Hall of Fame
            </h1>
            <p className="text-gray-400 mt-1">Champions of {selectedSeason.name}</p>
          </div>

          <SeasonSelector
            seasons={completedSeasons}
            selectedSeasonId={selectedSeasonId}
            onSelect={setSelectedSeasonId}
            showAllTime={true}
          />
        </div>

        {/* Season Info */}
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <Calendar className="w-6 h-6 text-accent-primary" />
            <div>
              <h2 className="text-xl font-bold">{selectedSeason.name}</h2>
              <p className="text-gray-400 text-sm">
                {format(new Date(selectedSeason.start_date), 'MMMM d, yyyy')} -{' '}
                {format(new Date(selectedSeason.end_date), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Clan Champions */}
          <div className="card">
            <div className="p-6 border-b border-dark-600">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-accent-primary" />
                Clan Champions
              </h2>
            </div>
            <div className="p-6">
              {clanChampions.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No clan champions recorded</p>
              ) : (
                <div className="space-y-4">
                  {clanChampions.map((champion) => (
                    <ChampionCard
                      key={champion.id}
                      rank={champion.final_rank}
                      name={champion.clan?.name || 'Unknown Clan'}
                      tag={champion.clan?.tag}
                      linkTo={`/clan/${champion.clan_id}`}
                      stats={{
                        points: champion.points,
                        wins: champion.matches_won,
                        losses: champion.matches_lost,
                        powerWins: champion.power_wins
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Warrior Champions */}
          <div className="card">
            <div className="p-6 border-b border-dark-600">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <Swords className="w-5 h-5 text-accent-primary" />
                Warrior Champions
              </h2>
            </div>
            <div className="p-6">
              {warriorChampions.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No warrior champions recorded</p>
              ) : (
                <div className="space-y-4">
                  {warriorChampions.map((champion) => (
                    <ChampionCard
                      key={champion.id}
                      rank={champion.final_rank}
                      name={champion.profile?.nickname || 'Unknown Warrior'}
                      subtitle={champion.clan?.tag ? `[${champion.clan.tag}]` : undefined}
                      linkTo={`/player/${champion.user_id}`}
                      stats={{
                        points: champion.points,
                        wins: champion.wins,
                        losses: champion.losses,
                        powerWins: champion.power_wins
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Back button */}
        <button
          onClick={() => setSelectedSeasonId(null)}
          className="btn-secondary"
        >
          View All Seasons
        </button>
      </div>
    )
  }

  // Show all seasons overview
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
            Hall of Fame
          </h1>
          <p className="text-gray-400 mt-1">Legendary champions across all seasons</p>
        </div>

        {completedSeasons.length > 0 && (
          <SeasonSelector
            seasons={completedSeasons}
            selectedSeasonId={selectedSeasonId}
            onSelect={setSelectedSeasonId}
            showAllTime={true}
          />
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6 bg-gradient-to-br from-yellow-400/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-400/20 rounded-xl">
              <Trophy className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-yellow-400">
                {hallOfFameData.reduce((sum, d) => sum + d.clanChampions.filter(c => c.final_rank === 1).length, 0)}
              </p>
              <p className="text-gray-400 text-sm">Clan Gold Medals</p>
            </div>
          </div>
        </div>
        <div className="card p-6 bg-gradient-to-br from-gray-300/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-300/20 rounded-xl">
              <Medal className="w-6 h-6 text-gray-300" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-300">
                {hallOfFameData.reduce((sum, d) => sum + d.warriorChampions.filter(c => c.final_rank === 1).length, 0)}
              </p>
              <p className="text-gray-400 text-sm">Warrior Gold Medals</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent-primary/20 rounded-xl">
              <Calendar className="w-6 h-6 text-accent-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold">{completedSeasons.length}</p>
              <p className="text-gray-400 text-sm">Completed Seasons</p>
            </div>
          </div>
        </div>
      </div>

      {/* Seasons Grid */}
      {hallOfFameData.length === 0 ? (
        <div className="card p-12 text-center">
          <Star className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-400 mb-2">No Completed Seasons Yet</h2>
          <p className="text-gray-500">
            Champions will be crowned when the current season ends.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {hallOfFameData.map((seasonData) => (
            <div key={seasonData.season.id} className="card overflow-hidden">
              {/* Season Header */}
              <div className="p-6 bg-gradient-to-r from-accent-primary/10 to-transparent border-b border-dark-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-yellow-400" />
                    <div>
                      <h2 className="text-xl font-bold">{seasonData.season.name}</h2>
                      <p className="text-sm text-gray-400">
                        {format(new Date(seasonData.season.start_date), 'MMM d')} -{' '}
                        {format(new Date(seasonData.season.end_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedSeasonId(seasonData.season.id)}
                    className="btn-secondary text-sm"
                  >
                    View Details
                  </button>
                </div>
              </div>

              {/* Champions Grid */}
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-dark-600">
                {/* Clan Champion */}
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Clan Champion
                  </h3>
                  {seasonData.clanChampions[0] ? (
                    <div className="flex items-center gap-4">
                      <SingleBadge type="gold" rank={1} size="md" />
                      <div>
                        <Link
                          to={`/clan/${seasonData.clanChampions[0].clan_id}`}
                          className="font-bold text-lg hover:text-accent-primary transition-colors"
                        >
                          {seasonData.clanChampions[0].clan?.name}
                        </Link>
                        <p className="text-sm text-gray-400">
                          {seasonData.clanChampions[0].points} pts •{' '}
                          {seasonData.clanChampions[0].matches_won}W-{seasonData.clanChampions[0].matches_lost}L
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No champion</p>
                  )}
                </div>

                {/* Warrior Champion */}
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
                    <Swords className="w-4 h-4" />
                    Warrior Champion
                  </h3>
                  {seasonData.warriorChampions[0] ? (
                    <div className="flex items-center gap-4">
                      <SingleBadge type="gold" rank={1} size="md" />
                      <div>
                        <Link
                          to={`/player/${seasonData.warriorChampions[0].user_id}`}
                          className="font-bold text-lg hover:text-accent-primary transition-colors"
                        >
                          {seasonData.warriorChampions[0].profile?.nickname}
                        </Link>
                        <p className="text-sm text-gray-400">
                          {seasonData.warriorChampions[0].points} pts •{' '}
                          {seasonData.warriorChampions[0].wins}W-{seasonData.warriorChampions[0].losses}L
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No champion</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Champion card component
interface ChampionCardProps {
  rank: number
  name: string
  tag?: string
  subtitle?: string
  linkTo: string
  stats: {
    points: number
    wins: number
    losses: number
    powerWins: number
  }
}

function ChampionCard({ rank, name, tag, subtitle, linkTo, stats }: ChampionCardProps) {
  const getBadgeType = () => {
    if (rank === 1) return 'gold' as const
    if (rank === 2) return 'silver' as const
    return 'bronze' as const
  }

  const getBgClass = () => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400/10 to-transparent'
    if (rank === 2) return 'bg-gradient-to-r from-gray-300/10 to-transparent'
    if (rank === 3) return 'bg-gradient-to-r from-orange-400/10 to-transparent'
    return ''
  }

  return (
    <div className={`p-4 rounded-xl ${getBgClass()} border border-dark-600`}>
      <div className="flex items-center gap-4">
        <SingleBadge type={getBadgeType()} rank={rank} size="md" />
        <div className="flex-1">
          <Link
            to={linkTo}
            className="font-bold text-lg hover:text-accent-primary transition-colors flex items-center gap-2"
          >
            {tag && <span className="text-accent-primary">[{tag}]</span>}
            {name}
          </Link>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
            <span className="text-accent-primary font-semibold">{stats.points} pts</span>
            <span>{stats.wins}W-{stats.losses}L</span>
            <span className="text-accent-warning">{stats.powerWins} PW</span>
          </div>
        </div>
      </div>
    </div>
  )
}
