import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Swords,
  Trophy,
  Users,
  User,
  LogOut,
  Menu,
  X,
  Shield,
  Bell,
  Star,
  Check,
  XCircle,
  Clock
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { usePendingInvitations, useClanActions } from '../../hooks/useClans'
import { StatusIndicator } from '../ui/StatusIndicator'
import { format } from 'date-fns'

export function Navbar() {
  const { user, profile, clan, isAdmin, signOut } = useAuth()
  const { invitations, refetch: refetchInvitations } = usePendingInvitations()
  const { acceptInvitation, declineInvitation } = useClanActions()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleAcceptInvitation = async (invitationId: string) => {
    setProcessingId(invitationId)
    const { error } = await acceptInvitation(invitationId)
    setProcessingId(null)

    if (!error) {
      setNotificationsOpen(false)
      // Navigate to home and let the AuthContext refresh
      navigate('/')
      // Small delay to ensure navigation completes, then refetch
      setTimeout(() => {
        refetchInvitations()
      }, 100)
    }
  }

  const handleDeclineInvitation = async (invitationId: string) => {
    setProcessingId(invitationId)
    const { error } = await declineInvitation(invitationId)
    if (!error) {
      refetchInvitations()
    }
    setProcessingId(null)
  }

  const navLinks = [
    { to: '/', label: 'Rankings', icon: Trophy },
    { to: '/clans', label: 'Browse', icon: Users },
    { to: '/hall-of-fame', label: 'Hall of Fame', icon: Star },
    ...(clan ? [{ to: `/clan/${clan.id}`, label: 'My Clan', icon: Shield }] : []),
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: Shield }] : [])
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="sticky top-0 z-40 bg-dark-900/80 backdrop-blur-lg border-b border-dark-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="p-2 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg shadow-lg shadow-accent-primary/25 group-hover:shadow-accent-primary/40 transition-shadow">
              <Swords className="w-6 h-6 text-white" />
            </div>
            <span className="font-display text-xl font-bold gradient-text hidden sm:block">
              ClanWars League
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                  ${isActive(to)
                    ? 'bg-accent-primary/20 text-accent-primary'
                    : 'text-gray-400 hover:text-white hover:bg-dark-700'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* User Section */}
          <div className="flex items-center gap-4">
            {user && profile ? (
              <>
                {/* Notifications Dropdown */}
                <div className="relative" ref={notificationRef}>
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className={`relative p-2 rounded-lg transition-colors ${
                      notificationsOpen
                        ? 'bg-dark-700 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-dark-700'
                    }`}
                  >
                    <Bell className="w-5 h-5" />
                    {invitations.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-danger rounded-full text-xs flex items-center justify-center animate-pulse">
                        {invitations.length}
                      </span>
                    )}
                  </button>

                  {/* Dropdown */}
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                      <div className="p-4 border-b border-dark-600">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Bell className="w-4 h-4 text-accent-primary" />
                          Notifications
                        </h3>
                      </div>

                      {invitations.length === 0 ? (
                        <div className="p-6 text-center text-gray-400">
                          <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No new notifications</p>
                        </div>
                      ) : (
                        <div className="max-h-96 overflow-y-auto">
                          {invitations.map((invitation) => (
                            <div
                              key={invitation.id}
                              className="p-4 border-b border-dark-700 hover:bg-dark-700/50 transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold">{invitation.clan?.tag}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">
                                    Clan Invitation
                                  </p>
                                  <p className="text-accent-primary text-sm font-semibold truncate">
                                    {invitation.clan?.name}
                                  </p>
                                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                    <Clock className="w-3 h-3" />
                                    Expires {format(new Date(invitation.expires_at), 'MMM d')}
                                  </p>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => handleAcceptInvitation(invitation.id)}
                                  disabled={!!clan || processingId === invitation.id}
                                  className="flex-1 py-2 px-3 bg-accent-success/20 text-accent-success rounded-lg text-sm font-medium hover:bg-accent-success/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                                >
                                  {processingId === invitation.id ? (
                                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <Check className="w-4 h-4" />
                                      Accept
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeclineInvitation(invitation.id)}
                                  disabled={processingId === invitation.id}
                                  className="flex-1 py-2 px-3 bg-accent-danger/20 text-accent-danger rounded-lg text-sm font-medium hover:bg-accent-danger/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Decline
                                </button>
                              </div>

                              {clan && (
                                <p className="text-xs text-yellow-400 mt-2">
                                  Leave your current clan to accept
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <Link
                        to="/invitations"
                        onClick={() => setNotificationsOpen(false)}
                        className="block p-3 text-center text-sm text-accent-primary hover:bg-dark-700 transition-colors"
                      >
                        View all invitations
                      </Link>
                    </div>
                  )}
                </div>

                {/* Profile Dropdown */}
                <div className="hidden md:flex items-center gap-3">
                  <StatusIndicator isOnline={profile.is_online} size="sm" />
                  <Link
                    to={`/player/${profile.id}`}
                    className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center overflow-hidden">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.nickname} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold">
                          {profile.nickname.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="font-medium">{profile.nickname}</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 text-gray-400 hover:text-white"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="btn-primary text-sm py-2">
                  Sign in with Discord
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && user && profile && (
          <div className="md:hidden py-4 border-t border-dark-600">
            <div className="flex flex-col gap-2">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                    ${isActive(to)
                      ? 'bg-accent-primary/20 text-accent-primary'
                      : 'text-gray-400 hover:text-white hover:bg-dark-700'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </Link>
              ))}

              {/* Mobile Invitations Link */}
              {invitations.length > 0 && (
                <Link
                  to="/invitations"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-accent-warning hover:bg-dark-700"
                >
                  <Bell className="w-5 h-5" />
                  Invitations
                  <span className="ml-auto bg-accent-danger px-2 py-0.5 rounded-full text-xs">
                    {invitations.length}
                  </span>
                </Link>
              )}

              <div className="border-t border-dark-600 my-2" />

              <Link
                to={`/player/${profile.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white"
              >
                <User className="w-5 h-5" />
                My Profile
              </Link>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
