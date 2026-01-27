import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users,
  Plus,
  Search,
  Trophy,
  Zap,
  Crown
} from 'lucide-react'
import { useClans, useClanActions } from '../hooks/useClans'
import { useAuth } from '../contexts/AuthContext'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Modal } from '../components/ui/Modal'
import { Alert } from '../components/ui/Alert'

export function ClansListPage() {
  const { clans, loading } = useClans()
  const { user, clan: userClan } = useAuth()
  const { createClan } = useClanActions()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newClanName, setNewClanName] = useState('')
  const [newClanTag, setNewClanTag] = useState('')
  const [newClanDesc, setNewClanDesc] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  const filteredClans = clans.filter(
    (clan) =>
      clan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clan.tag.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateClan = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')

    if (newClanTag.length < 2 || newClanTag.length > 5) {
      setCreateError('Tag must be 2-5 characters')
      return
    }

    if (newClanName.length < 3 || newClanName.length > 30) {
      setCreateError('Name must be 3-30 characters')
      return
    }

    setCreateLoading(true)

    const { error, data } = await createClan(newClanName, newClanTag, newClanDesc || undefined)

    if (error) {
      setCreateError(error.message)
      setCreateLoading(false)
    } else if (data) {
      setShowCreateModal(false)
      navigate(`/clan/${data.id}`)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">
            <span className="gradient-text">All Clans</span>
          </h1>
          <p className="text-gray-400 mt-1">
            Browse and discover competing clans
          </p>
        </div>

        {user && !userClan && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Clan
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search clans by name or tag..."
          className="input-field pl-12"
        />
      </div>

      {/* Clans Grid */}
      {loading ? (
        <div className="py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredClans.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-400 mb-2">
            {searchQuery ? 'No clans found' : 'No clans yet'}
          </h3>
          <p className="text-gray-500">
            {searchQuery
              ? 'Try a different search term'
              : 'Be the first to create a clan!'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClans.map((clan, index) => (
            <Link
              key={clan.id}
              to={`/clan/${clan.id}`}
              className="card-hover p-6 group"
            >
              <div className="flex items-start gap-4">
                {/* Rank Badge */}
                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-lg group-hover:shadow-accent-primary/30 transition-shadow">
                    <span className="text-lg font-display font-bold">{clan.tag}</span>
                  </div>
                  {index < 3 && (
                    <div className="absolute -top-2 -right-2">
                      <Crown
                        className={`w-5 h-5 ${
                          index === 0
                            ? 'text-yellow-400'
                            : index === 1
                            ? 'text-gray-300'
                            : 'text-orange-400'
                        }`}
                      />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-lg text-white group-hover:text-accent-primary transition-colors truncate">
                    {clan.name}
                  </h3>
                  <p className="text-sm text-gray-500">Rank #{index + 1}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="bg-dark-700/50 rounded-lg py-2">
                  <p className="text-lg font-bold text-accent-primary">{clan.points}</p>
                  <p className="text-xs text-gray-500">Points</p>
                </div>
                <div className="bg-dark-700/50 rounded-lg py-2">
                  <p className="text-lg font-bold text-accent-success">{clan.matches_won}</p>
                  <p className="text-xs text-gray-500">Wins</p>
                </div>
                <div className="bg-dark-700/50 rounded-lg py-2">
                  <p className="text-lg font-bold text-accent-warning flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3" />
                    {clan.power_wins}
                  </p>
                  <p className="text-xs text-gray-500">PW</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Clan Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setCreateError('')
        }}
        title="Create New Clan"
      >
        <form onSubmit={handleCreateClan} className="space-y-5">
          {createError && <Alert type="error" message={createError} />}

          <Alert
            type="info"
            message="As the creator, you will be the Captain (Boss) of the clan with full management permissions."
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Clan Tag * <span className="text-gray-500">(2-5 characters)</span>
            </label>
            <input
              type="text"
              value={newClanTag}
              onChange={(e) => setNewClanTag(e.target.value.toUpperCase())}
              className="input-field uppercase"
              placeholder="TAG"
              maxLength={5}
              minLength={2}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Clan Name * <span className="text-gray-500">(3-30 characters)</span>
            </label>
            <input
              type="text"
              value={newClanName}
              onChange={(e) => setNewClanName(e.target.value)}
              className="input-field"
              placeholder="Your Clan Name"
              maxLength={30}
              minLength={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              value={newClanDesc}
              onChange={(e) => setNewClanDesc(e.target.value)}
              className="input-field resize-none"
              rows={3}
              placeholder="Tell others about your clan..."
              maxLength={200}
            />
          </div>

          <div className="bg-dark-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400">
              <strong className="text-white">Requirements:</strong>
              <br />
              • Minimum 5 members to participate in matches
              <br />
              • Maximum 10 members per clan
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLoading}
              className="btn-primary"
            >
              {createLoading ? 'Creating...' : 'Create Clan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
