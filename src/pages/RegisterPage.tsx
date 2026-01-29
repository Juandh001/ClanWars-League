import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Swords, Mail, Lock, User, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (nickname.length < 3 || nickname.length > 20) {
      setError('Nickname must be between 3 and 20 characters')
      return
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(nickname)) {
      setError('Nickname can only contain letters, numbers, underscores and hyphens')
      return
    }

    setLoading(true)

    const { error } = await signUp(email, password, nickname)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // User is automatically logged in, redirect immediately
      navigate('/')
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8">
      <div className="w-full max-w-md">
        <div className="card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-2xl shadow-lg shadow-accent-primary/25 mb-4">
              <Swords className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-display font-bold mb-2">Join the Battle</h1>
            <p className="text-gray-400">Create your warrior account</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-300 mb-2">
                Nickname <span className="text-accent-primary">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="input-field pl-12"
                  placeholder="YourWarriorName"
                  minLength={3}
                  maxLength={20}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This will be your public display name
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address <span className="text-accent-primary">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-12"
                  placeholder="warrior@example.com"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Used for authentication only - never shown publicly
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password <span className="text-accent-primary">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-12"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password <span className="text-accent-primary">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field pl-12"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-accent-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
