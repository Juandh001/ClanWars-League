import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Users,
  Trophy,
  Zap,
  Crown,
  Shield,
  UserPlus,
  UserMinus,
  Flag,
  Calendar,
  TrendingUp,
  Clock
} from 'lucide-react'
import { useClan, useClanActions } from '../hooks/useClans'
import { useMatches } from '../hooks/useMatches'
import { useAuth } from '../contexts/AuthContext'
import { LoadingScreen } from '../components/ui/LoadingSpinner'
import { StatusIndicator } from '../components/ui/StatusIndicator'
import { Modal } from '../components/ui/Modal'
import { Alert } from '../components/ui/Alert'
import { format } from 'date-fns'

export function ClanPage() {
  const { id } = useParams<{ id: string }>()
  const { clan, loading, refetch } = useClan(id)
  const { matches } = useMatches(id)
  const { user, clan: userClan } = useAuth()
  const { inviteMember, kickMember } = useClanActions()

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState(false)

  const [showReportModal, setShowReportModal] = useState(false)

  const isCaptain = user && clan?.captain_id === user.id
  const isMember = user && clan?.members.some(m => m.user_id === user.id)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clan) return

    setInviteLoading(true)
    setInviteError('')

    const { error } = await inviteMember(clan.id, inviteEmail)

    if (error) {
      setInviteError(error.message)
    } else {
      setInviteSuccess(true)
      setInviteEmail('')
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
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-2xl shadow-accent-primary/25">
            <span className="text-3xl font-display font-bold">{clan.tag}</span>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-display font-bold mb-1">{clan.name}</h1>
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

              {isMember && !isCaptain && userClan?.id === clan.id && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Flag className="w-4 h-4" />
                  Report Loss
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
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
                <p className="text-2xl font-bold text-accent-warning flex items-center gap-1">
                  <Zap className="w-5 h-5" />
                  {clan.power_wins}
                </p>
                <p className="text-sm text-gray-400">Power Wins</p>
              </div>
              <div className="bg-dark-700/50 rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{winRate}%</p>
                <p className="text-sm text-gray-400">Win Rate</p>
              </div>
            </div>
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
                      <div className="w-10 h-10 rounded-lg bg-dark-600 flex items-center justify-center">
                        <span className="font-semibold">
                          {member.profile.nickname.charAt(0).toUpperCase()}
                        </span>
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
                        {match.power_win && isWin && (
                          <span className="flex items-center gap-1 text-xs text-accent-warning">
                            <Zap className="w-3 h-3" />
                            Power Win
                          </span>
                        )}
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
        }}
        title="Invite Player"
      >
        {inviteSuccess ? (
          <Alert type="success" message="Invitation sent successfully!" />
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <p className="text-gray-400 text-sm">
              Enter the email address of the player you want to invite.
              They must have an account with this email to accept.
            </p>

            {inviteError && <Alert type="error" message={inviteError} />}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Player Email
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="input-field"
                placeholder="player@example.com"
                required
              />
            </div>

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
                disabled={inviteLoading}
                className="btn-primary"
              >
                {inviteLoading ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Report Loss Modal */}
      <ReportLossModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        clanId={clan.id}
        onSuccess={refetch}
      />
    </div>
  )
}

// Report Loss Modal Component
function ReportLossModal({
  isOpen,
  onClose,
  clanId,
  onSuccess
}: {
  isOpen: boolean
  onClose: () => void
  clanId: string
  onSuccess: () => void
}) {
  const { useReportMatch } = require('../hooks/useMatches')
  const { useClans } = require('../hooks/useClans')

  const { reportLoss, submitting } = useReportMatch()
  const { clans } = useClans()

  const [winnerClanId, setWinnerClanId] = useState('')
  const [ourScore, setOurScore] = useState('')
  const [theirScore, setTheirScore] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPowerWin, setIsPowerWin] = useState(false)

  const availableClans = clans.filter((c: any) => c.id !== clanId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const loserScore = parseInt(ourScore)
    const winnerScore = parseInt(theirScore)

    if (loserScore >= winnerScore) {
      setError('Winner score must be higher than loser score when reporting a loss')
      return
    }

    const result = await reportLoss(winnerClanId, loserScore, winnerScore, notes || undefined)

    if (result.error) {
      setError(result.error.message)
    } else {
      setSuccess(true)
      setIsPowerWin(result.isPowerWin || false)
      setTimeout(() => {
        onClose()
        onSuccess()
        setSuccess(false)
        setWinnerClanId('')
        setOurScore('')
        setTheirScore('')
        setNotes('')
      }, 2500)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report Match Loss" size="lg">
      {success ? (
        <div className="text-center py-6">
          <div className="inline-flex p-4 bg-accent-success/20 rounded-full mb-4">
            <Trophy className="w-12 h-12 text-accent-success" />
          </div>
          <h3 className="text-xl font-bold mb-2">Match Reported!</h3>
          <p className="text-gray-400">
            Rankings have been updated.
            {isPowerWin && (
              <span className="block mt-2 text-accent-warning flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" />
                Power Win awarded to opponent (+4 points)
              </span>
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Alert
            type="info"
            message="Only the losing clan reports the match. This ensures fair play and prevents disputes."
          />

          {error && <Alert type="error" message={error} />}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Winner Clan *
            </label>
            <select
              value={winnerClanId}
              onChange={(e) => setWinnerClanId(e.target.value)}
              className="input-field"
              required
            >
              <option value="">Select the winning clan...</option>
              {availableClans.map((c: any) => (
                <option key={c.id} value={c.id}>
                  [{c.tag}] {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Our Score (Loser) *
              </label>
              <input
                type="number"
                min="0"
                value={ourScore}
                onChange={(e) => setOurScore(e.target.value)}
                className="input-field"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Their Score (Winner) *
              </label>
              <input
                type="number"
                min="1"
                value={theirScore}
                onChange={(e) => setTheirScore(e.target.value)}
                className="input-field"
                placeholder="0"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field resize-none"
              rows={3}
              placeholder="Any additional details..."
            />
          </div>

          <div className="bg-dark-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400">
              <strong className="text-white">Points Distribution:</strong>
              <br />
              Winner: +3 points (or +4 if Power Win)
              <br />
              Loser: 0 points
              <br />
              <span className="text-accent-warning flex items-center gap-1 mt-2">
                <Zap className="w-4 h-4" />
                Power Win: Score difference of 5+ points
              </span>
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
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
