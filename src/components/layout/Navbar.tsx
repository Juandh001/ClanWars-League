import React, { useState } from 'react'
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
  Home
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { usePendingInvitations } from '../../hooks/useClans'
import { StatusIndicator } from '../ui/StatusIndicator'

export function Navbar() {
  const { user, profile, clan, isAdmin, signOut } = useAuth()
  const { invitations } = usePendingInvitations()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navLinks = [
    { to: '/', label: 'Rankings', icon: Trophy },
    { to: '/clans', label: 'Clans', icon: Users },
    ...(clan ? [{ to: `/clan/${clan.id}`, label: 'My Clan', icon: Swords }] : []),
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
                {/* Notifications */}
                {invitations.length > 0 && (
                  <Link
                    to="/invitations"
                    className="relative p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-danger rounded-full text-xs flex items-center justify-center">
                      {invitations.length}
                    </span>
                  </Link>
                )}

                {/* Profile Dropdown */}
                <div className="hidden md:flex items-center gap-3">
                  <StatusIndicator isOnline={profile.is_online} size="sm" />
                  <Link
                    to={`/player/${profile.id}`}
                    className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                      <span className="text-sm font-bold">
                        {profile.nickname.charAt(0).toUpperCase()}
                      </span>
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
                <Link to="/login" className="btn-secondary text-sm py-2">
                  Login
                </Link>
                <Link to="/register" className="btn-primary text-sm py-2">
                  Register
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
