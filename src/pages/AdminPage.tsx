import React, { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Shield,
  Users,
  Swords,
  Trash2,
  Plus,
  Minus,
  Search,
  AlertTriangle,
  History,
  Zap,
  UserX,
  Ban,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useAdmin, useAdminData } from '../hooks/useAdmin'
import { LoadingScreen, LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Modal } from '../components/ui/Modal'
import { Alert } from '../components/ui/Alert'
import { StatusIndicator } from '../components/ui/StatusIndicator'
import { format } from 'date-fns'

type AdminTab = 'users' | 'clans' | 'actions'

export function AdminPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const { users, clans, actions, loading, refetch } = useAdminData()
  const {
    deleteUser,
    deleteClan,
    removePlayerFromClan,
    adjustClanPoints,
    adjustPowerWins,
    setUserRole,
    loading: actionLoading
  } = useAdmin()

  const [activeTab, setActiveTab] = useState<AdminTab>('clans')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal states
  const [showPointsModal, setShowPointsModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedClan, setSelectedClan] = useState<any>(null)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [pointsChange, setPointsChange] = useState('')
  const [pointsReason, setPointsReason] = useState('')
  const [isPowerWins, setIsPowerWins] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (isAdmin) {
      refetch()
    }
  }, [isAdmin, refetch])

  if (authLoading) {
    return <LoadingScreen message="Checking permissions..." />
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  const filteredUsers = users.filter(
    (u) =>
      u.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredClans = clans.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tag.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAdjustPoints = async () => {
    if (!selectedClan || !pointsChange || !pointsReason) return

    setError('')
    const change = parseInt(pointsChange)

    let result
    if (isPowerWins) {
      result = await adjustPowerWins(selectedClan.id, change, pointsReason)
    } else {
      result = await adjustClanPoints(selectedClan.id, change, pointsReason)
    }

    if (result.error) {
      setError(result.error.message)
    } else {
      setSuccess(`Successfully adjusted ${isPowerWins ? 'power wins' : 'points'} for ${selectedClan.name}`)
      setShowPointsModal(false)
      setPointsChange('')
      setPointsReason('')
      setSelectedClan(null)
      refetch()
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const handleDeleteClan = async () => {
    if (!selectedClan) return

    setError('')
    const { error } = await deleteClan(selectedClan.id)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(`Clan "${selectedClan.name}" has been deleted`)
      setShowDeleteModal(false)
      setSelectedClan(null)
      refetch()
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    setError('')
    const { error } = await deleteUser(selectedUser.id)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(`User "${selectedUser.nickname}" has been deleted`)
      setShowDeleteModal(false)
      setSelectedUser(null)
      refetch()
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const handleToggleAdmin = async (userId: string, currentRole: string, nickname: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    const action = newRole === 'admin' ? 'promote to admin' : 'demote from admin'

    if (!confirm(`Are you sure you want to ${action} "${nickname}"?`)) return

    const { error } = await setUserRole(userId, newRole)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(`${nickname} is now ${newRole === 'admin' ? 'an admin' : 'a regular user'}`)
      refetch()
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const openPointsModal = (clan: any, powerWins: boolean = false) => {
    setSelectedClan(clan)
    setIsPowerWins(powerWins)
    setShowPointsModal(true)
  }

  const openDeleteClanModal = (clan: any) => {
    setSelectedClan(clan)
    setSelectedUser(null)
    setShowDeleteModal(true)
  }

  const openDeleteUserModal = (user: any) => {
    setSelectedUser(user)
    setSelectedClan(null)
    setShowDeleteModal(true)
  }

  const tabs = [
    { id: 'clans' as AdminTab, label: 'Clans', icon: Swords, count: clans.length },
    { id: 'users' as AdminTab, label: 'Users', icon: Users, count: users.length },
    { id: 'actions' as AdminTab, label: 'Action Log', icon: History, count: actions.length }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Shield className="w-8 h-8 text-accent-danger" />
            <span className="gradient-text">Admin Panel</span>
          </h1>
          <p className="text-gray-400 mt-1">Manage clans, users, and platform settings</p>
        </div>
        <button onClick={refetch} className="btn-secondary flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-600 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
              ${activeTab === tab.id
                ? 'bg-accent-primary text-white'
                : 'text-gray-400 hover:text-white hover:bg-dark-700'
              }
            `}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className="text-xs bg-dark-700 px-2 py-0.5 rounded-full">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      {activeTab !== 'actions' && (
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="input-field pl-12"
          />
        </div>
      )}

      {loading ? (
        <div className="py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Clans Tab */}
          {activeTab === 'clans' && (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-dark-700/50">
                  <tr>
                    <th className="table-header">Clan</th>
                    <th className="table-header text-center">Members</th>
                    <th className="table-header text-center">Points</th>
                    <th className="table-header text-center">Power Wins</th>
                    <th className="table-header text-center">W/L</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  {filteredClans.map((clan) => (
                    <tr key={clan.id} className="hover:bg-dark-700/30 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                            <span className="text-xs font-bold">{clan.tag}</span>
                          </div>
                          <div>
                            <p className="font-semibold">{clan.name}</p>
                            <p className="text-xs text-gray-500">[{clan.tag}]</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-center text-gray-400">
                        ?/10
                      </td>
                      <td className="table-cell text-center">
                        <span className="text-accent-primary font-bold">{clan.points}</span>
                      </td>
                      <td className="table-cell text-center">
                        <span className="text-accent-warning font-bold flex items-center justify-center gap-1">
                          <Zap className="w-3 h-3" />
                          {clan.power_wins}
                        </span>
                      </td>
                      <td className="table-cell text-center">
                        <span className="text-accent-success">{clan.matches_won}</span>
                        /
                        <span className="text-accent-danger">{clan.matches_lost}</span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openPointsModal(clan, false)}
                            className="p-2 text-accent-primary hover:bg-accent-primary/20 rounded-lg transition-colors"
                            title="Adjust Points"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openPointsModal(clan, true)}
                            className="p-2 text-accent-warning hover:bg-accent-warning/20 rounded-lg transition-colors"
                            title="Adjust Power Wins"
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteClanModal(clan)}
                            className="p-2 text-accent-danger hover:bg-accent-danger/20 rounded-lg transition-colors"
                            title="Delete Clan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-dark-700/50">
                  <tr>
                    <th className="table-header">User</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Role</th>
                    <th className="table-header">Joined</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-dark-700/30 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-dark-600 flex items-center justify-center">
                            <span className="font-semibold">
                              {user.nickname.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold">{user.nickname}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <StatusIndicator
                          isOnline={user.is_online}
                          lastSeen={user.last_seen}
                          showLabel
                        />
                      </td>
                      <td className="table-cell">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            user.role === 'admin'
                              ? 'bg-accent-danger/20 text-accent-danger'
                              : 'bg-dark-600 text-gray-400'
                          }`}
                        >
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="table-cell text-gray-400 text-sm">
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleAdmin(user.id, user.role, user.nickname)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.role === 'admin'
                                ? 'text-gray-400 hover:bg-dark-600'
                                : 'text-accent-warning hover:bg-accent-warning/20'
                            }`}
                            title={user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteUserModal(user)}
                            className="p-2 text-accent-danger hover:bg-accent-danger/20 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Actions Log Tab */}
          {activeTab === 'actions' && (
            <div className="card overflow-hidden">
              {actions.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No admin actions logged yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-dark-700/50">
                    <tr>
                      <th className="table-header">Date</th>
                      <th className="table-header">Admin</th>
                      <th className="table-header">Action</th>
                      <th className="table-header">Target</th>
                      <th className="table-header">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700">
                    {actions.map((action) => (
                      <tr key={action.id} className="hover:bg-dark-700/30 transition-colors">
                        <td className="table-cell text-gray-400 text-sm">
                          {format(new Date(action.created_at), 'MMM d, HH:mm')}
                        </td>
                        <td className="table-cell font-medium">
                          {action.admin?.nickname || 'Unknown'}
                        </td>
                        <td className="table-cell">
                          <span className="px-2 py-1 bg-dark-600 rounded text-xs font-mono">
                            {action.action_type}
                          </span>
                        </td>
                        <td className="table-cell text-gray-400 text-sm">
                          {action.target_type}
                        </td>
                        <td className="table-cell text-xs text-gray-500 max-w-xs truncate">
                          {action.details ? JSON.stringify(action.details) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {/* Adjust Points Modal */}
      <Modal
        isOpen={showPointsModal}
        onClose={() => {
          setShowPointsModal(false)
          setSelectedClan(null)
          setPointsChange('')
          setPointsReason('')
          setError('')
        }}
        title={`Adjust ${isPowerWins ? 'Power Wins' : 'Points'} - ${selectedClan?.name || ''}`}
      >
        <div className="space-y-4">
          {error && <Alert type="error" message={error} />}

          <div className="bg-dark-700/50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400 mb-1">
              Current {isPowerWins ? 'Power Wins' : 'Points'}
            </p>
            <p className="text-3xl font-bold text-accent-primary">
              {isPowerWins ? selectedClan?.power_wins : selectedClan?.points}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Change Amount <span className="text-gray-500">(use negative to subtract)</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setPointsChange('-1')}
                className="btn-secondary px-4"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={pointsChange}
                onChange={(e) => setPointsChange(e.target.value)}
                className="input-field text-center"
                placeholder="0"
              />
              <button
                onClick={() => setPointsChange('+1')}
                className="btn-secondary px-4"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason *
            </label>
            <input
              type="text"
              value={pointsReason}
              onChange={(e) => setPointsReason(e.target.value)}
              className="input-field"
              placeholder="Reason for adjustment..."
              required
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowPointsModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleAdjustPoints}
              disabled={!pointsChange || !pointsReason || actionLoading}
              className="btn-primary"
            >
              {actionLoading ? 'Applying...' : 'Apply Change'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedClan(null)
          setSelectedUser(null)
          setError('')
        }}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          {error && <Alert type="error" message={error} />}

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-red-400 font-semibold">Warning: This action cannot be undone!</p>
              <p className="text-sm text-red-400/70 mt-1">
                {selectedClan
                  ? `All members, invitations, and match history for "${selectedClan.name}" will be permanently deleted.`
                  : `User "${selectedUser?.nickname}" and all their data will be permanently deleted.`}
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={selectedClan ? handleDeleteClan : handleDeleteUser}
              disabled={actionLoading}
              className="btn-danger"
            >
              {actionLoading ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
