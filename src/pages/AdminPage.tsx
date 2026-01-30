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
  UserX,
  RefreshCw,
  Calendar,
  Play,
  StopCircle,
  Trophy,
  Crown,
  Edit3
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useAdmin, useAdminData } from '../hooks/useAdmin'
import { useSeasons, useSeasonActions } from '../hooks/useSeasons'
import { LoadingScreen, LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Modal } from '../components/ui/Modal'
import { Alert } from '../components/ui/Alert'
import { StatusIndicator } from '../components/ui/StatusIndicator'
import { format } from 'date-fns'

type AdminTab = 'users' | 'clans' | 'seasons' | 'actions'

export function AdminPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const { users, clans, actions, loading, refetch } = useAdminData()
  const { seasons, loading: seasonsLoading, refetch: refetchSeasons } = useSeasons()
  const { startNewSeason, closeSeason, updateSeason, loading: seasonActionLoading } = useSeasonActions()
  const {
    deleteUser,
    deleteClan,
    removePlayerFromClan,
    adjustClanPoints,
    adjustWarriorPoints,
    setUserRole,
    loading: actionLoading
  } = useAdmin()

  const [activeTab, setActiveTab] = useState<AdminTab>('clans')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal states
  const [showPointsModal, setShowPointsModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showSeasonModal, setShowSeasonModal] = useState(false)
  const [selectedClan, setSelectedClan] = useState<any>(null)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [pointsChange, setPointsChange] = useState('')
  const [pointsReason, setPointsReason] = useState('')
  const [newSeasonName, setNewSeasonName] = useState('')
  const [adjustingUser, setAdjustingUser] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Season edit modal states
  const [showEditSeasonModal, setShowEditSeasonModal] = useState(false)
  const [editingSeason, setEditingSeason] = useState<any>(null)
  const [editSeasonStartDate, setEditSeasonStartDate] = useState('')
  const [editSeasonEndDate, setEditSeasonEndDate] = useState('')

  const currentSeason = seasons.find(s => s.is_active)

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
    if ((!selectedClan && !selectedUser) || !pointsChange || !pointsReason) return

    setError('')
    const change = parseInt(pointsChange)

    let result
    if (adjustingUser && selectedUser) {
      result = await adjustWarriorPoints(selectedUser.id, change, pointsReason)
    } else if (selectedClan) {
      result = await adjustClanPoints(selectedClan.id, change, pointsReason)
    } else {
      return
    }

    if (result.error) {
      setError(result.error.message)
    } else {
      setSuccess(`Successfully adjusted points for ${adjustingUser ? selectedUser?.nickname : selectedClan?.name}`)
      setShowPointsModal(false)
      setPointsChange('')
      setPointsReason('')
      setSelectedClan(null)
      setSelectedUser(null)
      setAdjustingUser(false)
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

  const openPointsModal = (clan: any) => {
    setSelectedClan(clan)
    setSelectedUser(null)
    setAdjustingUser(false)
    setShowPointsModal(true)
  }

  const openUserPointsModal = (user: any) => {
    setSelectedUser(user)
    setSelectedClan(null)
    setAdjustingUser(true)
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

  const handleStartNewSeason = async () => {
    if (!newSeasonName.trim()) {
      setError('Please enter a season name')
      return
    }

    // Calculate the next season number
    const maxSeasonNumber = seasons.length > 0
      ? Math.max(...seasons.map(s => s.number))
      : 0
    const nextSeasonNumber = maxSeasonNumber + 1

    setError('')
    const { error } = await startNewSeason(newSeasonName.trim(), nextSeasonNumber, 30)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(`Season "${newSeasonName}" has been started!`)
      setShowSeasonModal(false)
      setNewSeasonName('')
      refetchSeasons()
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const handleCloseSeason = async (seasonId: string, seasonName: string) => {
    if (!confirm(`Are you sure you want to close "${seasonName}"? This will award badges to top 3 clans and warriors.`)) {
      return
    }

    setError('')
    const { error } = await closeSeason(seasonId)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(`Season "${seasonName}" has been closed. Badges awarded!`)
      refetchSeasons()
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const openEditSeasonModal = (season: any) => {
    setEditingSeason(season)
    // Format dates for datetime-local input (YYYY-MM-DDTHH:mm)
    setEditSeasonStartDate(new Date(season.start_date).toISOString().slice(0, 16))
    setEditSeasonEndDate(new Date(season.end_date).toISOString().slice(0, 16))
    setShowEditSeasonModal(true)
  }

  const handleUpdateSeason = async () => {
    if (!editingSeason) return

    setError('')
    const { error } = await updateSeason(editingSeason.id, {
      start_date: new Date(editSeasonStartDate).toISOString(),
      end_date: new Date(editSeasonEndDate).toISOString()
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(`Season "${editingSeason.name}" has been updated!`)
      setShowEditSeasonModal(false)
      setEditingSeason(null)
      refetchSeasons()
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const tabs = [
    { id: 'clans' as AdminTab, label: 'Clans', icon: Swords, count: clans.length },
    { id: 'users' as AdminTab, label: 'Users', icon: Users, count: users.length },
    { id: 'seasons' as AdminTab, label: 'Seasons', icon: Calendar, count: seasons.length },
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
      {activeTab !== 'actions' && activeTab !== 'seasons' && (
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
                        {(clan as any).member_count || 0}/10
                      </td>
                      <td className="table-cell text-center">
                        <span className="text-accent-primary font-bold">{clan.points}</span>
                      </td>
                      <td className="table-cell text-center">
                        <span className="text-accent-success">{clan.matches_won}</span>
                        /
                        <span className="text-accent-danger">{clan.matches_lost}</span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openPointsModal(clan)}
                            className="p-2 text-accent-primary hover:bg-accent-primary/20 rounded-lg transition-colors"
                            title="Adjust Points"
                          >
                            <Plus className="w-4 h-4" />
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
                            onClick={() => openUserPointsModal(user)}
                            className="p-2 text-accent-primary hover:bg-accent-primary/20 rounded-lg transition-colors"
                            title="Adjust Points"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
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

          {/* Seasons Tab */}
          {activeTab === 'seasons' && (
            <div className="space-y-6">
              {/* Current Season Card */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-accent-primary" />
                    Current Season
                  </h3>
                  <button
                    onClick={() => setShowSeasonModal(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Start New Season
                  </button>
                </div>

                {currentSeason ? (
                  <div className="bg-gradient-to-r from-accent-primary/10 to-transparent border border-accent-primary/30 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-accent-primary">{currentSeason.name}</p>
                        <p className="text-gray-400 text-sm mt-1">
                          Season #{currentSeason.number} • Started {format(new Date(currentSeason.start_date), 'MMM d, yyyy')}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          Ends: {format(new Date(currentSeason.end_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                          Active
                        </span>
                        <button
                          onClick={() => handleCloseSeason(currentSeason.id, currentSeason.name)}
                          disabled={seasonActionLoading}
                          className="btn-danger flex items-center gap-2"
                        >
                          <StopCircle className="w-4 h-4" />
                          End Season
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-dark-700/50 rounded-xl p-8 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-500 opacity-50" />
                    <p className="text-gray-400">No active season</p>
                    <p className="text-gray-500 text-sm mt-1">Start a new season to begin tracking stats</p>
                  </div>
                )}
              </div>

              {/* Season History */}
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-dark-600">
                  <h3 className="font-semibold flex items-center gap-2">
                    <History className="w-4 h-4 text-gray-400" />
                    Season History
                  </h3>
                </div>

                {seasonsLoading ? (
                  <div className="p-8">
                    <LoadingSpinner />
                  </div>
                ) : seasons.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No seasons created yet</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-dark-700/50">
                      <tr>
                        <th className="table-header">#</th>
                        <th className="table-header">Name</th>
                        <th className="table-header">Start Date</th>
                        <th className="table-header">End Date</th>
                        <th className="table-header text-center">Status</th>
                        <th className="table-header text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700">
                      {seasons.map((season) => (
                        <tr key={season.id} className="hover:bg-dark-700/30 transition-colors">
                          <td className="table-cell">
                            <span className="flex items-center justify-center w-8 h-8 bg-dark-600 rounded-lg font-bold">
                              {season.number}
                            </span>
                          </td>
                          <td className="table-cell font-semibold">
                            {season.name}
                          </td>
                          <td className="table-cell text-gray-400 text-sm">
                            {format(new Date(season.start_date), 'MMM d, yyyy')}
                          </td>
                          <td className="table-cell text-gray-400 text-sm">
                            {format(new Date(season.end_date), 'MMM d, yyyy')}
                          </td>
                          <td className="table-cell text-center">
                            {season.is_active ? (
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs font-medium">
                                Completed
                              </span>
                            )}
                          </td>
                          <td className="table-cell text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditSeasonModal(season)}
                                disabled={seasonActionLoading}
                                className="p-2 text-accent-primary hover:bg-accent-primary/20 rounded-lg transition-colors"
                                title="Edit Season Dates"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              {season.is_active && (
                                <button
                                  onClick={() => handleCloseSeason(season.id, season.name)}
                                  disabled={seasonActionLoading}
                                  className="p-2 text-accent-danger hover:bg-accent-danger/20 rounded-lg transition-colors"
                                  title="End Season"
                                >
                                  <StopCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
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
          setSelectedUser(null)
          setAdjustingUser(false)
          setPointsChange('')
          setPointsReason('')
          setError('')
        }}
        title={`Adjust Points - ${adjustingUser ? selectedUser?.nickname : selectedClan?.name || ''}`}
      >
        <div className="space-y-4">
          {error && <Alert type="error" message={error} />}

          <div className="bg-dark-700/50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400 mb-1">
              Current Points
            </p>
            <p className="text-3xl font-bold text-accent-primary">
              {adjustingUser ? selectedUser?.warrior_points || 0 : selectedClan?.points}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Change Amount
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setPointsChange(String((parseInt(pointsChange) || 0) - 1))}
                className="btn-secondary px-4"
                title="Decrease by 1"
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
                onClick={() => setPointsChange(String((parseInt(pointsChange) || 0) + 1))}
                className="btn-primary px-4"
                title="Increase by 1"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Positive = add points, Negative = subtract points
            </p>
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

      {/* New Season Modal */}
      <Modal
        isOpen={showSeasonModal}
        onClose={() => {
          setShowSeasonModal(false)
          setNewSeasonName('')
          setError('')
        }}
        title="Start New Season"
      >
        <div className="space-y-4">
          {error && <Alert type="error" message={error} />}

          {currentSeason && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
              <div>
                <p className="text-yellow-400 font-semibold">Active season will be closed</p>
                <p className="text-sm text-yellow-400/70 mt-1">
                  "{currentSeason.name}" will be closed and badges will be awarded to top 3 clans and warriors.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Season Name *
            </label>
            <input
              type="text"
              value={newSeasonName}
              onChange={(e) => setNewSeasonName(e.target.value)}
              className="input-field"
              placeholder="e.g., Season 2 - February 2025"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be Season #{(seasons.length || 0) + 1}
            </p>
          </div>

          <div className="bg-dark-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-2">What happens when you start a new season:</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li className="flex items-center gap-2">
                <Crown className="w-3 h-3 text-yellow-400" />
                Top 3 clans and warriors get gold/silver/bronze badges
              </li>
              <li className="flex items-center gap-2">
                <Trophy className="w-3 h-3 text-accent-primary" />
                All stats are preserved in season history
              </li>
              <li className="flex items-center gap-2">
                <RefreshCw className="w-3 h-3 text-accent-success" />
                Points and streaks reset for the new season
              </li>
            </ul>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowSeasonModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleStartNewSeason}
              disabled={!newSeasonName.trim() || seasonActionLoading}
              className="btn-primary flex items-center gap-2"
            >
              {seasonActionLoading ? (
                'Starting...'
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Season
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Season Modal */}
      <Modal
        isOpen={showEditSeasonModal}
        onClose={() => {
          setShowEditSeasonModal(false)
          setEditingSeason(null)
          setEditSeasonStartDate('')
          setEditSeasonEndDate('')
          setError('')
        }}
        title={`Edit Season - ${editingSeason?.name || ''}`}
      >
        <div className="space-y-4">
          {error && <Alert type="error" message={error} />}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="datetime-local"
              value={editSeasonStartDate}
              onChange={(e) => setEditSeasonStartDate(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="datetime-local"
              value={editSeasonEndDate}
              onChange={(e) => setEditSeasonEndDate(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowEditSeasonModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateSeason}
              disabled={!editSeasonStartDate || !editSeasonEndDate || seasonActionLoading}
              className="btn-primary"
            >
              {seasonActionLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
