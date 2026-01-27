import React from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  User,
  Trophy,
  Zap,
  Clock,
  Calendar,
  Shield,
  TrendingUp,
  Award
} from 'lucide-react'
import { useProfile, usePlayerStats } from '../hooks/useProfiles'
import { LoadingScreen } from '../components/ui/LoadingSpinner'
import { StatusIndicator } from '../components/ui/StatusIndicator'
import { format } from 'date-fns'

export function PlayerPage() {
  const { id } = useParams<{ id: string }>()
  const { profile, loading: profileLoading } = useProfile(id)
  const { stats, matches, loading: statsLoading } = usePlayerStats(id)

  const loading = profileLoading || statsLoading

  if (loading) {
    return <LoadingScreen message="Loading warrior profile..." />
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-400">Warrior not found</h2>
        <Link to="/" className="text-accent-primary hover:underline mt-2 inline-block">
          Back to rankings
        </Link>
      </div>
    )
  }

  const winRate = stats && stats.totalMatches > 0
    ? ((stats.wins / stats.totalMatches) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="card p-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-2xl shadow-accent-primary/25">
              <span className="text-4xl font-display font-bold">
                {profile.nickname.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1">
              <StatusIndicator
                isOnline={profile.is_online}
                lastSeen={profile.last_seen}
                size="lg"
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-display font-bold">{profile.nickname}</h1>
              {profile.role === 'admin' && (
                <span className="px-3 py-1 bg-accent-danger/20 text-accent-danger rounded-full text-xs font-bold">
                  ADMIN
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-gray-400">
              <StatusIndicator
                isOnline={profile.is_online}
                lastSeen={profile.last_seen}
                showLabel
              />
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Joined {format(new Date(profile.created_at), 'MMM yyyy')}
              </span>
            </div>

            {/* Clan Info */}
            {profile.clan_member && (
              <div className="mt-4 p-4 bg-dark-700/50 rounded-xl">
                <Link
                  to={`/clan/${profile.clan_member.clan.id}`}
                  className="flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                    <span className="font-bold">{profile.clan_member.clan.tag}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white group-hover:text-accent-primary transition-colors">
                      {profile.clan_member.clan.name}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      {profile.clan_member.role === 'captain' ? (
                        <>
                          <Shield className="w-3 h-3 text-yellow-400" />
                          Captain
                        </>
                      ) : (
                        'Member'
                      )}
                    </p>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-accent-primary/20 rounded-lg">
                <Trophy className="w-5 h-5 text-accent-primary" />
              </div>
              <span className="text-gray-400 text-sm">Matches</span>
            </div>
            <p className="text-3xl font-bold">{stats.totalMatches}</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-accent-success/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-accent-success" />
              </div>
              <span className="text-gray-400 text-sm">Win Rate</span>
            </div>
            <p className="text-3xl font-bold text-accent-success">{winRate}%</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-accent-warning/20 rounded-lg">
                <Zap className="w-5 h-5 text-accent-warning" />
              </div>
              <span className="text-gray-400 text-sm">Power Wins</span>
            </div>
            <p className="text-3xl font-bold text-accent-warning">{stats.powerWins}</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gray-500/20 rounded-lg">
                <Award className="w-5 h-5 text-gray-400" />
              </div>
              <span className="text-gray-400 text-sm">W/L</span>
            </div>
            <p className="text-3xl font-bold">
              <span className="text-accent-success">{stats.wins}</span>
              <span className="text-gray-500">/</span>
              <span className="text-accent-danger">{stats.losses}</span>
            </p>
          </div>
        </div>
      )}

      {/* Match History */}
      <div className="card">
        <div className="p-6 border-b border-dark-600">
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent-primary" />
            Match History
          </h2>
        </div>

        {!profile.clan_member ? (
          <div className="p-12 text-center text-gray-400">
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>This player is not currently in a clan</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No matches played yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-700/50">
                <tr>
                  <th className="table-header">Date</th>
                  <th className="table-header">Result</th>
                  <th className="table-header">Opponent</th>
                  <th className="table-header text-center">Score</th>
                  <th className="table-header text-center">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {matches.map((match) => {
                  const isWin = match.winner_clan_id === profile.clan_member?.clan.id
                  const opponent = isWin ? match.loser_clan : match.winner_clan

                  return (
                    <tr key={match.id} className="hover:bg-dark-700/30 transition-colors">
                      <td className="table-cell text-gray-400">
                        {format(new Date(match.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="table-cell">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                            isWin
                              ? 'bg-accent-success/20 text-accent-success'
                              : 'bg-accent-danger/20 text-accent-danger'
                          }`}
                        >
                          {isWin ? 'WIN' : 'LOSS'}
                          {match.power_win && isWin && (
                            <Zap className="w-3 h-3" />
                          )}
                        </span>
                      </td>
                      <td className="table-cell">
                        <Link
                          to={`/clan/${opponent.id}`}
                          className="flex items-center gap-2 text-accent-primary hover:underline"
                        >
                          <span className="font-medium">[{opponent.tag}]</span>
                          {opponent.name}
                        </Link>
                      </td>
                      <td className="table-cell text-center font-medium">
                        {match.winner_score} - {match.loser_score}
                      </td>
                      <td className="table-cell text-center">
                        <span
                          className={`font-bold ${
                            isWin ? 'text-accent-success' : 'text-gray-500'
                          }`}
                        >
                          {isWin ? `+${match.points_awarded}` : '0'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
