import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Users,
  Trophy,
  Crown,
  Shield,
  UserPlus,
  UserMinus,
  Flag,
  Calendar,
  TrendingUp,
  Clock,
  Flame,
  Star,
  Search,
  UserCheck,
  Edit3,
  Zap
} from 'lucide-react'
import { useClan, useClanActions, useClans, useUserSearch } from '../hooks/useClans'
import { useMatches, useReportMatch, useClanMembers, MATCH_MODES, getPlayersPerTeam } from '../hooks/useMatches'
import type { MatchMode } from '../types/database'
import { useBadges } from '../hooks/useBadges'
import { useAuth } from '../contexts/AuthContext'
import { LoadingScreen } from '../components/ui/LoadingSpinner'
import { StatusIndicator } from '../components/ui/StatusIndicator'
import { Modal } from '../components/ui/Modal'
import { Alert } from '../components/ui/Alert'
import { BadgeDisplay, BadgeSummary } from '../components/ui/BadgeDisplay'
import { StreakIndicator } from '../components/ui/StreakIndicator'
import { ClanEditModal } from '../components/ui/ClanEditModal'
import { format } from 'date-fns'

export function ClanPage() {
  const { id } = useParams<{ id: string }>()
  const { clan, loading, refetch } = useClan(id)
  const { matches } = useMatches(id)
  const { badges } = useBadges(id, 'clan')
  const { user, clan: userClan } = useAuth()
  const { inviteMemberByNickname, kickMember } = useClanActions()
  const { results: searchResults, loading: searchLoading, searchUsers, clearResults } = useUserSearch()

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteNickname, setInviteNickname] = useState('')
  const [selectedUser, setSelectedUser] = useState<{ id: string; nickname: string } | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [invitedName, setInvitedName] = useState('')

  const [showReportModal, setShowReportModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const isCaptain = user && clan?.captain_id === user.id
  const isMember = user && clan?.members.some(m => m.user_id === user.id)

  const handleSearchChange = (value: string) => {
    setInviteNickname(value)
    setSelectedUser(null)
    if (value.length >= 2) {
      searchUsers(value)
    } else {
      clearResults()
    }
  }

  const handleSelectUser = (user: { id: string; nickname: string }) => {
    setSelectedUser(user)
    setInviteNickname(user.nickname)
    clearResults()
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clan || !inviteNickname) return

    setInviteLoading(true)
    setInviteError('')

    const { error, invitedUser } = await inviteMemberByNickname(clan.id, inviteNickname)

    if (error) {
      setInviteError(error.message)
    } else {
      setInvitedName(invitedUser?.nickname || inviteNickname)
      setInviteSuccess(true)
      setInviteNickname('')
      setSelectedUser(null)
      setTimeout(() => {
        setShowInviteModal(false)
        setInviteSuccess(false)
      }, 2000)
    }

    setInviteLoading(false)
  }

  const handleKick = async (memberId: string, nickname: string) => {
    if (!clan || !confirm(`Are you sure you want to kick ${nickname}?`)) return

    const { error } = await kickMember(clan.id, memberId)
    if (error) {
      alert(error.message)
    } else {
      refetch()
    }
  }

  if (loading) {
    return <LoadingScreen message="Loading clan..." />
  }

  if (!clan) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-400">Clan not found</h2>
        <Link to="/clans" className="text-accent-primary hover:underline mt-2 inline-block">
          Browse all clans
        </Link>
      </div>
    )
  }

  const winRate = clan.matches_played > 0
    ? ((clan.matches_won / clan.matches_played) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-8">
      {/* Clan Header */}
      <div className="card p-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Logo */}
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-2xl shadow-accent-primary/25 overflow-hidden">
            {clan.logo_url ? (
              <img src={clan.logo_url} alt={clan.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-display font-bold">{clan.tag}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-display font-bold">{clan.name}</h1>
                  {isCaptain && (
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="p-2 text-gray-400 hover:text-accent-primary hover:bg-dark-700 rounded-lg transition-colors"
                      title="Edit Clan"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                  )}
                  {badges.length > 0 && (
                    <BadgeDisplay badges={badges} size="md" showSeasonInfo />
                  )}
                </div>
                <p className="text-gray-400 text-sm">[{clan.tag}]</p>
                {clan.description && (
                  <p className="text-gray-400 mt-3 max-w-xl">{clan.description}</p>
                )}
              </div>

              {/* Actions */}
              {isCaptain && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="btn-primary flex items-center gap-2"
                    disabled={clan.members.length >= 10}
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite
                  </button>
                </div>
              )}

              {isMember && userClan && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Flag className="w-4 h-4" />
                  Report Match
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
              <div className="bg-dark-700/50 rounded-xl p-4">
                <p className="text-2xl font-bold text-accent-primary">{clan.points}</p>
                <p className="text-sm text-gray-400">Points</p>
              </div>
              <div className="bg-dark-700/50 rounded-xl p-4">
                <p className="text-2xl font-bold text-accent-success">{clan.matches_won}</p>
                <p className="text-sm text-gray-400">Wins</p>
              </div>
              <div className="bg-dark-700/50 rounded-xl p-4">
                <p className="text-2xl font-bold text-accent-danger">{clan.matches_lost}</p>
                <p className="text-sm text-gray-400">Losses</p>
              </div>
              <div className="bg-dark-700/50 rounded-xl p-4">
                <div className="text-2xl font-bold">
                  <StreakIndicator
                    winStreak={clan.current_win_streak || 0}
                    lossStreak={clan.current_loss_streak || 0}
                    maxStreak={clan.max_win_streak || 0}
                    showMax
                    size="lg"
                  />
                </div>
                <p className="text-sm text-gray-400">Streak</p>
              </div>
              <div className="bg-dark-700/50 rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{winRate}%</p>
                <p className="text-sm text-gray-400">Win Rate</p>
              </div>
            </div>

            {/* Achievements */}
            {badges.length > 0 && (
              <div className="mt-6 p-4 bg-gradient-to-r from-yellow-500/10 to-transparent rounded-xl border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <h3 className="font-semibold text-yellow-400">Season Achievements</h3>
                </div>
                <BadgeSummary badges={badges} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Members List */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="p-6 border-b border-dark-600">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-accent-primary" />
                Roster ({clan.members.length}/10)
              </h2>
            </div>

            <div className="divide-y divide-dark-700">
              {clan.members.map((member) => {
                const isOnline = member.profile.is_online
                const isMemberCaptain = member.role === 'captain'

                return (
                  <div
                    key={member.id}
                    className="p-4 flex items-center justify-between hover:bg-dark-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <StatusIndicator
                        isOnline={isOnline}
                        lastSeen={member.profile.last_seen}
                      />
                      <div className="w-10 h-10 rounded-lg bg-dark-600 flex items-center justify-center overflow-hidden">
                        {member.profile.avatar_url ? (
                          <img src={member.profile.avatar_url} alt={member.profile.nickname} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-semibold">
                            {member.profile.nickname.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <Link
                          to={`/player/${member.user_id}`}
                          className="font-semibold hover:text-accent-primary transition-colors flex items-center gap-2"
                        >
                          {member.profile.nickname}
                          {isMemberCaptain && (
                            <Crown className="w-4 h-4 text-yellow-400" />
                          )}
                        </Link>
                        <p className="text-sm text-gray-500">
                          {isMemberCaptain ? 'Captain' : 'Member'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusIndicator
                        isOnline={isOnline}
                        lastSeen={member.profile.last_seen}
                        showLabel
                        size="sm"
                      />

                      {isCaptain && !isMemberCaptain && (
                        <button
                          onClick={() => handleKick(member.user_id, member.profile.nickname)}
                          className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                          title="Kick member"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {clan.members.length < 5 && (
                <div className="p-4 bg-yellow-500/10 border-l-4 border-yellow-500">
                  <p className="text-yellow-400 text-sm">
                    Clan needs at least 5 members to participate in matches.
                    ({5 - clan.members.length} more needed)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Match History */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="p-6 border-b border-dark-600">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-accent-primary" />
                Recent Matches
              </h2>
            </div>

            {matches.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No matches played yet</p>
              </div>
            ) : (
              <div className="divide-y divide-dark-700 max-h-96 overflow-y-auto">
                {matches.slice(0, 10).map((match) => {
                  const isWin = match.winner_clan_id === clan.id
                  const opponent = isWin ? match.loser_clan : match.winner_clan

                  return (
                    <div key={match.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                            isWin
                              ? 'bg-accent-success/20 text-accent-success'
                              : 'bg-accent-danger/20 text-accent-danger'
                          }`}
                        >
                          {isWin ? 'Victory' : 'Defeat'}
                        </span>
                      </div>
                      <p className="font-medium">
                        vs{' '}
                        <Link
                          to={`/clan/${opponent.id}`}
                          className="text-accent-primary hover:underline"
                        >
                          {opponent.name}
                        </Link>
                      </p>
                      <p className="text-sm text-gray-500">
                        {match.winner_score} - {match.loser_score}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(match.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false)
          setInviteError('')
          setInviteSuccess(false)
          setInviteNickname('')
          setSelectedUser(null)
          clearResults()
        }}
        title="Invite Player"
      >
        {inviteSuccess ? (
          <div className="text-center py-4">
            <div className="inline-flex p-3 bg-accent-success/20 rounded-full mb-3">
              <UserCheck className="w-8 h-8 text-accent-success" />
            </div>
            <Alert type="success" message={`Invitation sent to ${invitedName}!`} />
            <p className="text-gray-400 text-sm mt-2">
              They will receive a notification to accept or decline.
            </p>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <p className="text-gray-400 text-sm">
              Search for a player by their nickname to send them a clan invitation.
            </p>

            {inviteError && <Alert type="error" message={inviteError} />}

            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Player Nickname
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={inviteNickname}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Search by nickname..."
                  required
                  autoComplete="off"
                />
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && !selectedUser && (
                <div className="absolute z-10 w-full mt-1 bg-dark-700 border border-dark-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {searchResults
                    .filter(u => !clan?.members.some(m => m.user_id === u.id))
                    .map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectUser({ id: user.id, nickname: user.nickname })}
                        className="w-full px-4 py-3 text-left hover:bg-dark-600 flex items-center gap-3 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-dark-500 flex items-center justify-center overflow-hidden">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.nickname} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium">
                              {user.nickname.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{user.nickname}</p>
                          <p className="text-xs text-gray-500">
                            {user.is_online ? (
                              <span className="text-green-400">Online</span>
                            ) : (
                              'Offline'
                            )}
                          </p>
                        </div>
                      </button>
                    ))}
                  {searchResults.filter(u => !clan?.members.some(m => m.user_id === u.id)).length === 0 && (
                    <p className="px-4 py-3 text-gray-400 text-sm">
                      All matching users are already in your clan
                    </p>
                  )}
                </div>
              )}
            </div>

            {selectedUser && (
              <div className="bg-dark-700/50 rounded-lg p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                  <span className="font-bold">
                    {selectedUser.nickname.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{selectedUser.nickname}</p>
                  <p className="text-xs text-gray-500">Ready to invite</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null)
                    setInviteNickname('')
                  }}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviteLoading || !inviteNickname}
                className="btn-primary flex items-center gap-2"
              >
                {inviteLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Report Match Modal */}
      <ReportLossModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSuccess={refetch}
      />

      {/* Edit Clan Modal */}
      {isCaptain && (
        <ClanEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => refetch()}
          clan={{
            id: clan.id,
            name: clan.name,
            tag: clan.tag,
            description: clan.description,
            logo_url: clan.logo_url
          }}
        />
      )}
    </div>
  )
}

// Report Loss Modal Component - Only losing clan reports
function ReportLossModal({
  isOpen,
  onClose,
  onSuccess
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const { reportLoss, submitting } = useReportMatch()
  const { clans } = useClans()
  const { clan: userClan } = useAuth()

  const [winnerClanId, setWinnerClanId] = useState('')
  const [matchMode, setMatchMode] = useState<MatchMode>('5v5')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [pointsAwarded, setPointsAwarded] = useState(0)
  const [formatMultiplier, setFormatMultiplier] = useState(1)

  // Participant selection
  const [selectedWinnerPlayers, setSelectedWinnerPlayers] = useState<string[]>([])
  const [selectedLoserPlayers, setSelectedLoserPlayers] = useState<string[]>([])

  // Fetch members for both teams
  const { members: winnerMembers, loading: winnerLoading } = useClanMembers(winnerClanId || null)
  const { members: loserMembers, loading: loserLoading } = useClanMembers(userClan?.id || null)

  // Get all clans and filter for opponent selection
  const userClanId = userClan?.id
  const opponentClans = clans.filter((c: any) => c.id !== userClanId)
  const playersRequired = getPlayersPerTeam(matchMode)

  // Format multipliers for display
  const FORMAT_MULTIPLIERS: Record<MatchMode, number> = {
    '1v1': 1.0, '2v2': 1.2, '3v3': 1.5, '4v4': 1.8, '5v5': 2.2, '6v6': 2.5
  }

  // Reset participant selection when winner clan or mode changes
  const handleWinnerChange = (newWinnerId: string) => {
    setWinnerClanId(newWinnerId)
    setSelectedWinnerPlayers([])
  }

  const handleModeChange = (newMode: MatchMode) => {
    setMatchMode(newMode)
    setSelectedWinnerPlayers([])
    setSelectedLoserPlayers([])
  }

  const toggleWinnerPlayer = (playerId: string) => {
    setSelectedWinnerPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId)
      }
      if (prev.length >= playersRequired) {
        return prev
      }
      return [...prev, playerId]
    })
  }

  const toggleLoserPlayer = (playerId: string) => {
    setSelectedLoserPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId)
      }
      if (prev.length >= playersRequired) {
        return prev
      }
      return [...prev, playerId]
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!winnerClanId) {
      setError('Please select the winning clan')
      return
    }

    // Validate participant count
    if (selectedWinnerPlayers.length !== playersRequired) {
      setError(`Please select exactly ${playersRequired} players from the winning team`)
      return
    }
    if (selectedLoserPlayers.length !== playersRequired) {
      setError(`Please select exactly ${playersRequired} players from your team`)
      return
    }

    const result = await reportLoss(
      winnerClanId,
      matchMode,
      selectedWinnerPlayers,
      selectedLoserPlayers,
      notes || undefined
    )

    if (result.error) {
      setError(result.error.message)
    } else {
      setSuccess(true)
      setPointsAwarded(result.pointsAwarded || 0)
      setFormatMultiplier(result.formatMultiplier || 1)
      setTimeout(() => {
        onClose()
        onSuccess()
        setSuccess(false)
        setWinnerClanId('')
        setMatchMode('5v5')
        setNotes('')
        setSelectedWinnerPlayers([])
        setSelectedLoserPlayers([])
      }, 2500)
    }
  }

  const selectedWinnerClan = clans.find((c: any) => c.id === winnerClanId)
  const calculatedPoints = Math.round(100 * FORMAT_MULTIPLIERS[matchMode])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report Match Loss" size="xl">
      {success ? (
        <div className="text-center py-6">
          <div className="inline-flex p-4 bg-accent-success/20 rounded-full mb-4">
            <Trophy className="w-12 h-12 text-accent-success" />
          </div>
          <h3 className="text-xl font-bold mb-2">Match Reported!</h3>
          <p className="text-gray-400">
            Rankings and warrior stats have been updated.
            <span className="block mt-2 text-accent-primary flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" />
              Winner awarded +{pointsAwarded} PP ({formatMultiplier}x multiplier)
            </span>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Alert
            type="info"
            message="Only the losing clan reports the match. Select the winning clan and participating players."
          />

          {error && <Alert type="error" message={error} />}

          {/* Match Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Match Mode *
            </label>
            <div className="grid grid-cols-6 gap-2">
              {MATCH_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleModeChange(mode)}
                  className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                    matchMode === mode
                      ? 'bg-accent-primary text-white'
                      : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Multiplier: {FORMAT_MULTIPLIERS[matchMode]}x = <span className="text-accent-primary font-semibold">{calculatedPoints} PP</span> for winner
            </p>
          </div>

          {/* Winner Clan Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Winning Clan (Opponent) *
            </label>
            <select
              value={winnerClanId}
              onChange={(e) => handleWinnerChange(e.target.value)}
              className="input-field"
              required
            >
              <option value="">Select the winning clan...</option>
              {opponentClans.map((c: any) => (
                <option key={c.id} value={c.id}>
                  [{c.tag}] {c.name} ({c.points} pts)
                </option>
              ))}
            </select>
          </div>

          {/* Participant Selection - Only show when winner is selected */}
          {winnerClanId && (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Winner Team Roster */}
              <div className="bg-dark-700/50 rounded-lg p-4">
                <h4 className="font-semibold text-accent-success mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Winner [{selectedWinnerClan?.tag}]
                  </span>
                  <span className="text-xs bg-dark-600 px-2 py-1 rounded">
                    {selectedWinnerPlayers.length}/{playersRequired}
                  </span>
                </h4>
                {winnerLoading ? (
                  <p className="text-gray-400 text-sm">Loading players...</p>
                ) : winnerMembers.length === 0 ? (
                  <p className="text-gray-400 text-sm">No players found</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {winnerMembers.map((member) => (
                      <label
                        key={member.id}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                          selectedWinnerPlayers.includes(member.id)
                            ? 'bg-accent-success/20 border border-accent-success/50'
                            : 'bg-dark-600 hover:bg-dark-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedWinnerPlayers.includes(member.id)}
                          onChange={() => toggleWinnerPlayer(member.id)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          selectedWinnerPlayers.includes(member.id)
                            ? 'bg-accent-success border-accent-success'
                            : 'border-gray-500'
                        }`}>
                          {selectedWinnerPlayers.includes(member.id) && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm">{member.nickname}</span>
                        {member.clanRole === 'captain' && (
                          <Crown className="w-3 h-3 text-yellow-400" />
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Loser Team Roster (Our Team) */}
              <div className="bg-dark-700/50 rounded-lg p-4">
                <h4 className="font-semibold text-accent-danger mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Our Team [{userClan?.tag}]
                  </span>
                  <span className="text-xs bg-dark-600 px-2 py-1 rounded">
                    {selectedLoserPlayers.length}/{playersRequired}
                  </span>
                </h4>
                {loserLoading ? (
                  <p className="text-gray-400 text-sm">Loading players...</p>
                ) : loserMembers.length === 0 ? (
                  <p className="text-gray-400 text-sm">No players found</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {loserMembers.map((member) => (
                      <label
                        key={member.id}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                          selectedLoserPlayers.includes(member.id)
                            ? 'bg-accent-danger/20 border border-accent-danger/50'
                            : 'bg-dark-600 hover:bg-dark-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedLoserPlayers.includes(member.id)}
                          onChange={() => toggleLoserPlayer(member.id)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          selectedLoserPlayers.includes(member.id)
                            ? 'bg-accent-danger border-accent-danger'
                            : 'border-gray-500'
                        }`}>
                          {selectedLoserPlayers.includes(member.id) && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm">{member.nickname}</span>
                        {member.clanRole === 'captain' && (
                          <Crown className="w-3 h-3 text-yellow-400" />
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field resize-none"
              rows={2}
              placeholder="Any additional details..."
            />
          </div>

          {/* Points Info */}
          <div className="bg-dark-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400">
              <strong className="text-white">Power Points (PP) System:</strong>
              <br />
              Base: 100 PP × Format Multiplier
              <br />
              <span className="text-accent-primary mt-2 block">
                <strong>{matchMode}:</strong> 100 × {FORMAT_MULTIPLIERS[matchMode]} = <span className="font-bold">{calculatedPoints} PP</span>
              </span>
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !winnerClanId || selectedWinnerPlayers.length !== playersRequired || selectedLoserPlayers.length !== playersRequired}
              className="btn-danger"
            >
              {submitting ? 'Reporting...' : 'Report Loss'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
