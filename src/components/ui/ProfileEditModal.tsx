import React, { useState, useRef } from 'react'
import { X, Camera, User, AlertCircle, Check, Clock } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { LoadingSpinner } from './LoadingSpinner'

interface ProfileEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function ProfileEditModal({ isOpen, onClose, onSuccess }: ProfileEditModalProps) {
  const { profile, updateProfile, refreshProfile } = useAuth()
  const [nickname, setNickname] = useState(profile?.nickname || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen || !profile) return null

  // Calculate days until nickname can be changed
  const getDaysUntilNicknameChange = (): number => {
    if (!profile.nickname_changed_at) return 0
    const lastChange = new Date(profile.nickname_changed_at)
    const now = new Date()
    const diffTime = now.getTime() - lastChange.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const daysRemaining = 30 - diffDays
    return daysRemaining > 0 ? daysRemaining : 0
  }

  const daysUntilChange = getDaysUntilNicknameChange()
  const canChangeNickname = daysUntilChange === 0
  const nicknameChanged = nickname !== profile.nickname

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setAvatarFile(file)
    setError('')

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !profile) return null

    const fileExt = avatarFile.name.split('.').pop()
    const fileName = `${profile.id}/avatar.${fileExt}`

    console.log('Uploading avatar:', fileName)

    // Delete old avatar if exists
    if (profile.avatar_url && profile.avatar_url.includes('avatars')) {
      try {
        const oldPath = profile.avatar_url.split('/avatars/')[1]
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath])
        }
      } catch (e) {
        console.warn('Could not delete old avatar:', e)
      }
    }

    // Upload new avatar
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile, { upsert: true })

    console.log('Upload result:', { data, error })

    if (error) {
      // Check if bucket doesn't exist
      if (error.message.includes('Bucket not found') || error.message.includes('bucket')) {
        throw new Error('Avatar storage is not configured. Please create the "avatars" bucket in Supabase Dashboard > Storage.')
      }
      throw new Error(`Failed to upload avatar: ${error.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
    console.log('Public URL:', urlData.publicUrl)
    return urlData.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate nickname if changed
    if (nicknameChanged) {
      if (!canChangeNickname) {
        setError(`You can change your nickname in ${daysUntilChange} days`)
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

      // Check if nickname is already taken
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .ilike('nickname', nickname)
        .neq('id', profile.id)
        .single()

      if (existingUser) {
        setError('This nickname is already taken')
        return
      }
    }

    setLoading(true)
    console.log('Starting profile update...', { avatarFile: !!avatarFile, nicknameChanged })

    try {
      const updates: { nickname?: string; avatar_url?: string } = {}

      // Upload avatar if changed
      if (avatarFile) {
        console.log('Uploading avatar...')
        const avatarUrl = await uploadAvatar()
        console.log('Avatar uploaded:', avatarUrl)
        if (avatarUrl) {
          updates.avatar_url = avatarUrl
        }
      }

      // Update nickname if changed
      if (nicknameChanged && canChangeNickname) {
        updates.nickname = nickname
      }

      console.log('Updates to apply:', updates)

      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        const { error } = await updateProfile(updates)
        console.log('Update result:', { error })
        if (error) {
          setError(error.message)
          setLoading(false)
          return
        }
      }

      await refreshProfile()
      setSuccess('Profile updated successfully!')

      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1000)
    } catch (err) {
      console.error('Profile update error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const currentAvatar = avatarPreview || profile.avatar_url

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-dark-800 rounded-2xl border border-dark-600 w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-600">
          <h2 className="text-xl font-display font-bold">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-2xl shadow-accent-primary/25 overflow-hidden">
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt={profile.nickname}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-display font-bold">
                    {profile.nickname.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity"
              >
                <Camera className="w-8 h-8 text-white" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 text-sm text-accent-primary hover:underline"
            >
              Change Avatar
            </button>
            <p className="text-xs text-gray-500 mt-1">Max 5MB (JPEG, PNG, GIF, WebP)</p>
          </div>

          {/* Nickname Section */}
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-300 mb-2">
              Nickname
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={!canChangeNickname}
                className="input-field pl-12 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="YourNickname"
                minLength={3}
                maxLength={20}
              />
            </div>

            {!canChangeNickname && (
              <div className="mt-2 flex items-center gap-2 text-sm text-accent-warning">
                <Clock className="w-4 h-4" />
                <span>You can change your nickname in {daysUntilChange} days</span>
              </div>
            )}

            {canChangeNickname && nicknameChanged && (
              <p className="mt-2 text-xs text-gray-500">
                Note: You can only change your nickname once every 30 days
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3 text-green-400">
              <Check className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{success}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-dark-700 text-gray-300 rounded-lg hover:bg-dark-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!avatarFile && !nicknameChanged)}
              className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
