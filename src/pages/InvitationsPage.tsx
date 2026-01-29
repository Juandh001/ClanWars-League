import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Check, X, Users, Clock, AlertCircle, UserPlus, XCircle } from 'lucide-react'
import { usePendingInvitations, useClanActions } from '../hooks/useClans'
import { useAuth } from '../contexts/AuthContext'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Alert } from '../components/ui/Alert'
import { format } from 'date-fns'

export function InvitationsPage() {
  const { invitations, loading, refetch } = usePendingInvitations()
  const { acceptInvitation, declineInvitation } = useClanActions()
  const { clan } = useAuth()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleAccept = async (invitationId: string, clanName: string) => {
    setProcessingId(invitationId)
    setError('')
    setSuccess('')

    const { error } = await acceptInvitation(invitationId)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(`You have joined ${clanName}!`)
      refetch()
      // Reload to update clan info
      setTimeout(() => window.location.reload(), 1500)
    }

    setProcessingId(null)
  }

  const handleDecline = async (invitationId: string, clanName: string) => {
    if (!confirm(`Are you sure you want to decline the invitation from ${clanName}?`)) {
      return
    }

    setProcessingId(invitationId)
    setError('')

    const { error } = await declineInvitation(invitationId)

    if (error) {
      setError(error.message)
    } else {
      refetch()
    }

    setProcessingId(null)
  }

  if (loading) {
    return (
      <div className="py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">
          <span className="gradient-text">Clan Invitations</span>
        </h1>
        <p className="text-gray-400 mt-1">
          Pending invitations to join clans
        </p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} />}

      {clan && (
        <Alert
          type="warning"
          message="You are already in a clan. Leave your current clan to accept a new invitation."
        />
      )}

      {invitations.length === 0 ? (
        <div className="card p-12 text-center">
          <Mail className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-400 mb-2">No Pending Invitations</h3>
          <p className="text-gray-500">
            When a clan captain invites you, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="card p-6 hover:border-dark-500 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-lg">
                    <span className="font-display font-bold">{invitation.clan?.tag}</span>
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg">
                      {invitation.clan?.name}
                    </h3>
                    <p className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                      <UserPlus className="w-4 h-4" />
                      Invited by <span className="text-accent-primary">{invitation.inviter?.nickname || 'Captain'}</span>
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-2">
                      <Clock className="w-3 h-3" />
                      Expires {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </div>

              {invitation.clan?.description && (
                <p className="mt-4 text-sm text-gray-400 bg-dark-700/50 rounded-lg p-3">
                  {invitation.clan.description}
                </p>
              )}

              <div className="mt-4 flex gap-4 text-sm">
                <span className="text-accent-primary font-medium">
                  {invitation.clan?.points || 0} Points
                </span>
                <span className="text-accent-success">
                  {invitation.clan?.matches_won || 0} Wins
                </span>
                <span className="text-accent-danger">
                  {invitation.clan?.matches_lost || 0} Losses
                </span>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => handleAccept(invitation.id, invitation.clan?.name || 'clan')}
                  disabled={!!clan || processingId === invitation.id}
                  className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processingId === invitation.id ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Accept Invitation
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDecline(invitation.id, invitation.clan?.name || 'clan')}
                  disabled={processingId === invitation.id}
                  className="py-2.5 px-4 bg-dark-700 text-gray-400 hover:text-accent-danger hover:bg-accent-danger/10 rounded-lg transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-center">
        <Link to="/clans" className="text-accent-primary hover:underline">
          Browse all clans
        </Link>
      </div>
    </div>
  )
}
